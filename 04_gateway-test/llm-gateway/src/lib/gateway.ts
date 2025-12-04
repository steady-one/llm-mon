import { prisma } from './prisma';
import { verifyApiKey } from './auth';
import { calculateCost, deductBalance, getProviderFromModel } from './pricing';

// Provider 설정
const PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    transform: (body: Record<string, unknown>) => body,
    parseResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      return { input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0 };
    },
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (key: string) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    transform: (body: Record<string, unknown>) => ({
      model: body.model,
      max_tokens: body.max_tokens || 4096,
      messages: (body.messages as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
    parseResponse: (data: Record<string, unknown>) => {
      const content = data.content as Array<{ text: string }> | undefined;
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      return {
        id: data.id,
        object: 'chat.completion',
        model: data.model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: content?.[0]?.text || '' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: usage?.input_tokens || 0,
          completion_tokens: usage?.output_tokens || 0,
          total_tokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
        },
      };
    },
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      return { input: usage?.input_tokens || 0, output: usage?.output_tokens || 0 };
    },
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    transform: (body: Record<string, unknown>) => body,
    parseResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      return { input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0 };
    },
  },
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    headers: (key: string) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    transform: (body: Record<string, unknown>) => body,
    parseResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      return { input: usage?.prompt_tokens || 0, output: usage?.completion_tokens || 0 };
    },
  },
};

const API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  xai: process.env.XAI_API_KEY,
};

interface GatewayResult {
  response: Response;
}

export async function handleGatewayRequest(request: Request): Promise<GatewayResult | { error: string; status: number }> {
  const startTime = Date.now();

  // API Key 검증
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authorization required', status: 401 };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const keyResult = await verifyApiKey(apiKey);
  if (!keyResult.valid || !keyResult.orgId) {
    return { error: 'Invalid API key', status: 401 };
  }

  // 요청 파싱
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid JSON', status: 400 };
  }

  const model = body.model as string;
  if (!model) {
    return { error: 'model is required', status: 400 };
  }

  // Provider 라우팅
  const routing = getProviderFromModel(model);
  if (!routing) {
    return { error: `Unknown model: ${model}`, status: 400 };
  }

  const { provider, actualModel } = routing;
  const config = PROVIDERS[provider as keyof typeof PROVIDERS];
  const providerKey = API_KEYS[provider];

  if (!config || !providerKey) {
    return { error: `Provider ${provider} not configured`, status: 500 };
  }

  // 요청 변환 및 전송
  const transformedBody = config.transform({ ...body, model: actualModel });
  const proxyResponse = await fetch(config.url, {
    method: 'POST',
    headers: config.headers(providerKey),
    body: JSON.stringify(transformedBody),
  });

  const latencyMs = Date.now() - startTime;
  const responseData = await proxyResponse.json();

  if (!proxyResponse.ok) {
    return {
      response: new Response(JSON.stringify({
        error: {
          message: (responseData.error as { message?: string })?.message || 'Provider error',
          type: 'provider_error',
        },
      }), { status: proxyResponse.status, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  // Usage 추출 및 비용 계산
  const usage = config.extractUsage(responseData);
  const cost = await calculateCost(provider, actualModel, usage.input, usage.output);

  // 잔액 차감
  if (cost > 0) {
    const deducted = await deductBalance(keyResult.orgId, cost, `${provider}/${actualModel}`);
    if (!deducted) {
      return { error: 'Insufficient balance', status: 402 };
    }
  }

  // 로깅 (llm-monitor 스키마와 호환)
  const MARGIN = parseFloat(process.env.MARGIN_PERCENT || '0.20');
  const providerCost = cost / (1 + MARGIN);
  const margin = cost - providerCost;

  await prisma.usageLog.create({
    data: {
      orgId: keyResult.orgId,
      apiKeyId: keyResult.keyId,
      provider,
      model: actualModel,
      inputTokens: usage.input,
      outputTokens: usage.output,
      providerCost,
      margin,
      totalCost: cost,
      endpoint: 'chat/completions',
      latencyMs,
      statusCode: proxyResponse.status,
      mode: 'reseller',
    },
  });

  // 응답 변환
  const finalResponse = config.parseResponse(responseData);

  return {
    response: new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}
