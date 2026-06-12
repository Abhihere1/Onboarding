import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = await getDb();
    const incident = await db.collection('Patch Transactions').findOne({
      incidentId: id,
      userId: new ObjectId(session.userId),
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (err) {
    console.error('Fetch incident error:', err);
    return NextResponse.json({ error: 'Failed to fetch incident.' }, { status: 500 });
  }
}
