import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const incidents = await db
      .collection('Patch Transactions')
      .find({ userId: new ObjectId(session.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ incidents });
  } catch (err) {
    console.error('Fetch incidents error:', err);
    return NextResponse.json({ error: 'Failed to fetch incidents.' }, { status: 500 });
  }
}
