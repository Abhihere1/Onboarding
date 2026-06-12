import { NextRequest, NextResponse } from 'next/server';
import { serveKbImage } from '@/lib/kb';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathParts } = await params;
  const filename = pathParts.join('/');
  const safeFilename = path.basename(filename);

  const buffer = await serveKbImage(safeFilename);
  if (!buffer) {
    console.error(`KB image not found: ${safeFilename}`);
    return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  }

  const ext = safeFilename.split('.').pop()?.toLowerCase() || 'png';
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
  });
}
