import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json() as { rating?: number; comment?: string };
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('Patch Transactions').updateOne(
      { incidentId: id, userId: new ObjectId(session.userId) },
      {
        $set: {
          feedback: {
            rating,
            comment: comment || '',
            submittedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Feedback submitted.' });
  } catch (err) {
    console.error('Feedback error:', err);
    return NextResponse.json({ error: 'Failed to submit feedback.' }, { status: 500 });
  }
}
