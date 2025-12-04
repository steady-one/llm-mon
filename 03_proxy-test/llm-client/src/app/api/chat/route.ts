import { NextRequest, NextResponse } from 'next/server';

const MONITOR_URL = process.env.MONITOR_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, provider, model, messages } = body;

    if (mode === 'passthrough') {
      return handlePassthrough(provider, model, messages);
    } else if (mode === 'reseller') {
      return handleReseller(model, messages);
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handlePassthrough(
  provider: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const monitorToken = process.env.MONITOR_TOKEN;

  if (!monitorToken) {
    return NextResponse.json(
      { error: 'MONITOR_TOKEN not configured' },
      { status: 500 }
    );
  }

  let endpoint: string;
  let requestBody: Record<string, unknown>;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Monitor-Token': monitorToken,
  };

  switch (provider) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
      }
      endpoint = `${MONITOR_URL}/api/v1/openai/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = { model, messages };
      break;
    }

    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
      }
      endpoint = `${MONITOR_URL}/api/v1/anthropic/messages`;
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      requestBody = {
        model,
        max_tokens: 4096,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      };
      break;
    }

    case 'google': {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'GOOGLE_API_KEY not configured' }, { status: 500 });
      }
      endpoint = `${MONITOR_URL}/api/v1/google/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = { model, messages };
      break;
    }

    case 'xai': {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 500 });
      }
      endpoint = `${MONITOR_URL}/api/v1/xai/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      requestBody = { model, messages };
      break;
    }

    default:
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || 'Provider error' },
      { status: response.status }
    );
  }

  // 응답 정규화
  let message: string;
  let usage: { inputTokens: number; outputTokens: number } | undefined;

  if (provider === 'anthropic') {
    message = data.content?.[0]?.text || '';
    usage = data.usage
      ? {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        }
      : undefined;
  } else {
    message = data.choices?.[0]?.message?.content || '';
    usage = data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        }
      : undefined;
  }

  return NextResponse.json({
    message,
    model: data.model || model,
    usage,
  });
}

async function handleReseller(
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'LLM_API_KEY not configured' },
      { status: 500 }
    );
  }

  const endpoint = `${MONITOR_URL}/api/v1/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message || 'API error' },
      { status: response.status }
    );
  }

  return NextResponse.json({
    message: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        }
      : undefined,
  });
}
