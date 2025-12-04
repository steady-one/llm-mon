import { NextRequest, NextResponse } from 'next/server';
import { proxyGoogle } from '@/lib/proxy/google';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const result = await proxyGoogle(request, path);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return result.response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const result = await proxyGoogle(request, path);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return result.response;
}
