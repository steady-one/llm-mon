import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3002';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!GATEWAY_API_KEY) {
      return NextResponse.json({ error: 'GATEWAY_API_KEY not configured' }, { status: 500 });
    }

    const { model, messages } = await request.json();

    const response = await fetch(`${GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gateway error' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      } : undefined,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
