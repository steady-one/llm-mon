import { NextRequest, NextResponse } from 'next/server';
import { proxyOpenAI } from '@/lib/proxy/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const result = await proxyOpenAI(request, path);

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
  const result = await proxyOpenAI(request, path);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return result.response;
}
