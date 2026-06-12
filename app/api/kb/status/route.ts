import { NextRequest, NextResponse } from 'next/server';
import { checkKbExists } from '@/lib/kb';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'vdi';
  const exists = await checkKbExists(category);
  return NextResponse.json({ category, exists });
}
