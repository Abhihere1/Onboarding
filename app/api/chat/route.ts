import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';
import { getKbContent } from '@/lib/kb';
import { callLLM } from '@/lib/llm';
import { Message } from '@/lib/types';

function generateIncidentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INC-${ts}-${rand}`;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      message: string;
      incidentId?: string;
      category?: string;
    };

    const { message, category } = body;
    let { incidentId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.userId);

    // Fetch or create incident
    let incident = null;
    if (incidentId) {
      incident = await db.collection('Patch Transactions').findOne({ incidentId, userId });
    }

    if (!incident) {
      incidentId = generateIncidentId();
      incident = {
        incidentId,
        userId,
        status: 'Open',
        category: category || '',
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('Patch Transactions').insertOne(incident);
    }

    if (incident.status !== 'Open') {
      return NextResponse.json({ error: 'This incident is already closed.' }, { status: 400 });
    }

    const history = (incident.history || []) as Message[];

    // Get KB context
    const activeCategory = category || incident.category || '';
    const kbContext = await getKbContent(activeCategory || undefined);

    // Call LLM
    const llmResponse = await callLLM(history, message, kbContext);

    // Build user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Build assistant message with controls
    const controls = buildControls(llmResponse);
    const assistantMessage: Message = {
      role: 'assistant',
      content: llmResponse.response,
      timestamp: new Date(),
      controls: controls || undefined,
    };

    // Determine new status
    let newStatus: 'Open' | 'Escalated' | 'Resolved' = 'Open';
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
      $push: { history: { $each: [userMessage, assistantMessage] } },
    };

    if (llmResponse.category && llmResponse.category !== incident.category) {
      updateFields['category'] = llmResponse.category;
    }

    if (llmResponse.should_escalate) {
      newStatus = 'Escalated';
      updateFields['status'] = 'Escalated';
      if (llmResponse.escalation_data) {
        updateFields['escalationDetails'] = {
          ...llmResponse.escalation_data,
          createdFor: session.username || session.email,
        };
      }
    } else if (llmResponse.should_resolve) {
      newStatus = 'Resolved';
      updateFields['status'] = 'Resolved';
      updateFields['resolutionDetails'] = { summary: llmResponse.response };
    } else {
      updateFields['status'] = 'Open';
    }

    await db.collection('Patch Transactions').updateOne(
      { incidentId: incidentId! },
      {
        $set: {
          updatedAt: updateFields['updatedAt'] as Date,
          status: updateFields['status'] || 'Open',
          ...(updateFields['category'] ? { category: updateFields['category'] } : {}),
          ...(updateFields['escalationDetails'] ? { escalationDetails: updateFields['escalationDetails'] } : {}),
          ...(updateFields['resolutionDetails'] ? { resolutionDetails: updateFields['resolutionDetails'] } : {}),
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $push: { history: { $each: [userMessage, assistantMessage] } } as any,
      },
    );

    // Fetch updated incident
    const updatedIncident = await db
      .collection('Patch Transactions')
      .findOne({ incidentId: incidentId! });

    return NextResponse.json({
      incidentId: incidentId!,
      status: newStatus,
      response: llmResponse.response,
      controls,
      should_escalate: llmResponse.should_escalate,
      should_resolve: llmResponse.should_resolve,
      escalation_data: llmResponse.escalation_data,
      category: llmResponse.category || activeCategory,
      incident: updatedIncident,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

function buildControls(llmResponse: {
  user_probable_options: string[];
  input_card_variables: { name: string; label: string; type: string; required: boolean }[];
  needs_count_first: boolean;
  count_prompt: string;
  total_cards: number;
}) {
  const { user_probable_options, input_card_variables, needs_count_first, total_cards } = llmResponse;

  if (needs_count_first) {
    return {
      type: 'count_first' as const,
      options: [] as string[],
      fieldDefinitions: [] as { name: string; label: string; type: string; required: boolean }[],
      isCompleted: false,
      totalCards: total_cards,
    };
  }

  if (input_card_variables.length > 0) {
    return {
      type: 'structured_form' as const,
      options: [] as string[],
      fieldDefinitions: input_card_variables,
      isCompleted: false,
      totalCards: total_cards || 1,
    };
  }

  if (user_probable_options.length >= 5) {
    return {
      type: 'single_select' as const,
      options: user_probable_options,
      fieldDefinitions: [] as { name: string; label: string; type: string; required: boolean }[],
      isCompleted: false,
      totalCards: 0,
    };
  }

  if (user_probable_options.length >= 2) {
    return {
      type: 'probable_options' as const,
      options: user_probable_options,
      fieldDefinitions: [] as { name: string; label: string; type: string; required: boolean }[],
      isCompleted: false,
      totalCards: 0,
    };
  }

  return null;
}
