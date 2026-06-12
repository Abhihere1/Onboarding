import { LLMResponse, Message, FieldDefinition } from './types';

const BASE_URL = process.env.OLLAMA_BASE_URL;
const API_KEY = process.env.OLLAMA_API_KEY;
const MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud';

export function validateLLMConfig(): void {
  const missing: string[] = [];
  if (!process.env.OLLAMA_BASE_URL) missing.push('OLLAMA_BASE_URL');
  if (!process.env.OLLAMA_API_KEY) missing.push('OLLAMA_API_KEY');
  if (!process.env.OLLAMA_MODEL) missing.push('OLLAMA_MODEL');
  if (missing.length > 0) {
    throw new Error(`Missing required LLM environment variables: ${missing.join(', ')}`);
  }
}

const SYSTEM_PROMPT = `You are Patch, a self-service IT support assistant for Discount Tire associates at the Discount Tire Information Center. Your role is to guide associates through technical troubleshooting using the provided Knowledge Base (KB) context only.

GROUNDING RULES:
- You MUST only use the provided KB context to suggest troubleshooting steps. Do NOT use external knowledge.
- If no KB context is provided or a topic is not covered, say you don't have information on that topic and ask a clarifying question.
- Always stay focused on resolving the associate's specific IT issue.
- Preserve ALL image tags from the KB exactly as they appear: ![alt](filename). NEVER describe images in text or remove image tags. Copy them verbatim into your response.

BEHAVIORAL GUARDRAILS:
- Prioritize issue completion over open-ended conversation.
- If the user sends off-topic content, briefly and warmly acknowledge it, then politely redirect: e.g., "I hope you're staying dry! Back to your VDI issue — did the restart help with the login error?" NOT "I cannot discuss weather. Focus on the issue."
- Never drift into social conversation, trivia, or unrelated advisory content.
- Prefer clear, direct, workflow-grounded language. Avoid creative paraphrasing.
- Do NOT expand into topics not covered by the KB context.

ACCEPTABLE REDIRECTION: "Ha, sounds like a busy day! Let's get your VDI sorted — were you able to try restarting the client?"
UNACCEPTABLE: "I am only able to discuss IT issues. Please stay on topic."

COUNT-FIRST RULE:
- If collecting repeated device details (e.g., multiple scanners, multiple user accounts), you MUST ask for the count first using needs_count_first: true and a count_prompt before returning input_card_variables.

OUTPUT FORMAT:
You MUST respond with ONLY a single valid JSON object. No markdown fences, no prose outside the JSON. Every response must include ALL of these fields:

{
  "response": "Your markdown-formatted response to the user. Use numbered lists, bold, and headings as appropriate. Include image tags verbatim from KB.",
  "user_probable_options": ["Option label 1", "Option label 2"],
  "input_card_variables": [{"name": "field_name", "label": "Display Label", "type": "text", "required": true}],
  "needs_count_first": false,
  "count_prompt": "",
  "total_cards": 0,
  "should_escalate": false,
  "escalation_data": null,
  "should_resolve": false,
  "category": "vdi"
}

FIELD RULES:
- response: Always provide a helpful, grounded response in markdown.
- user_probable_options: Use 2-4 contextually meaningful labels (e.g., "Yes, the restart fixed it" not just "Yes"). Use empty array [] if not applicable. If 5+ options needed, use single_select style (but still list all options here).
- input_card_variables: Array of field objects for structured input collection. Empty array [] if not applicable.
- needs_count_first: true only when you need to know how many repeated items to collect before showing input cards.
- count_prompt: The question to ask for the count (e.g., "How many devices need to be configured?"). Empty string if not applicable.
- total_cards: Number of input cards to render. 0 if not applicable.
- should_escalate: true ONLY when the issue cannot be resolved with the available KB and must be sent to L2 support.
- escalation_data: When should_escalate is true, provide: { "reason": string, "priority": "High|Medium|Low", "urgency": "High|Medium|Low", "impact": "High|Medium|Low", "supportGroup": "IT Support", "description": string, "createdFor": string }. Null otherwise.
- should_resolve: true ONLY when the user has confirmed the issue is fully resolved.
- category: The category slug that best matches the current issue (e.g., "vdi"). Use existing value if already established.

ESCALATION: Only escalate after attempting all available KB steps and the issue persists. Always try to resolve first.
RESOLUTION: Only set should_resolve: true after the user explicitly confirms the issue is fixed.`;

function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function extractJSON(raw: string): string {
  const stripped = stripFences(raw);
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) return stripped;
  return stripped.substring(start, end + 1);
}

function normalizeLLMResponse(parsed: Record<string, unknown>): LLMResponse {
  const toBool = (val: unknown): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return false;
  };

  const toStringArray = (val: unknown): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return [];
  };

  const toFieldDefs = (val: unknown): FieldDefinition[] => {
    if (!Array.isArray(val)) return [];
    return val.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const i = item as Record<string, unknown>;
        return {
          name: String(i.name || ''),
          label: String(i.label || ''),
          type: String(i.type || 'text'),
          required: toBool(i.required),
        };
      }
      return { name: '', label: '', type: 'text', required: false };
    });
  };

  return {
    response: String(parsed.response || 'I encountered an issue. Please try again.'),
    user_probable_options: toStringArray(parsed.user_probable_options),
    input_card_variables: toFieldDefs(parsed.input_card_variables),
    needs_count_first: toBool(parsed.needs_count_first),
    count_prompt: String(parsed.count_prompt || ''),
    total_cards: typeof parsed.total_cards === 'number' ? parsed.total_cards : 0,
    should_escalate: toBool(parsed.should_escalate),
    escalation_data: parsed.should_escalate
      ? (parsed.escalation_data as LLMResponse['escalation_data']) || null
      : null,
    should_resolve: toBool(parsed.should_resolve),
    category: typeof parsed.category === 'string' ? parsed.category : undefined,
  };
}

export async function callLLM(
  history: Message[],
  userMessage: string,
  kbContext: string,
): Promise<LLMResponse> {
  const systemWithKB = kbContext
    ? `${SYSTEM_PROMPT}\n\n--- KNOWLEDGE BASE CONTEXT ---\n${kbContext}\n--- END KNOWLEDGE BASE ---`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemWithKB },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  let rawContent = '';
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    rawContent = data?.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('LLM call failed:', err);
    return normalizeLLMResponse({ response: 'I\'m having trouble connecting right now. Please try again in a moment.' });
  }

  try {
    const jsonStr = extractJSON(rawContent);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return normalizeLLMResponse(parsed);
  } catch (parseErr) {
    console.error('LLM JSON parse failed:', parseErr, 'Raw:', rawContent);
    return normalizeLLMResponse({
      response: 'I encountered an issue processing the response. Please try again.',
    });
  }
}
