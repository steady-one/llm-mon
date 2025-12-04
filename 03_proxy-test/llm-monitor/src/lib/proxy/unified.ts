import { prisma } from '../prisma';
import { verifyApiKey } from '../auth';
import { calculateCost, deductBalance, getProviderFromModel } from '../pricing';

// Provider별 API 설정
const PROVIDER_CONFIG = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    getHeaders: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    transformRequest: (body: Record<string, unknown>) => body,
    transformResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;
      return {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
      };
    },
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    getHeaders: (apiKey: string) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    transformRequest: (body: Record<string, unknown>) => {
      // OpenAI 형식을 Anthropic 형식으로 변환
      const messages = body.messages as Array<{ role: string; content: string }>;

      // system 메시지 추출
      const systemMessages = messages.filter((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      // Anthropic은 첫 메시지가 user여야 함
      const anthropicMessages = nonSystemMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      return {
        model: body.model,
        max_tokens: body.max_tokens || 4096,
        ...(systemMessages.length > 0 && { system: systemMessages.map(m => m.content).join('\n') }),
        messages: anthropicMessages,
      };
    },
    transformResponse: (data: Record<string, unknown>) => {
      // Anthropic 응답을 OpenAI 형식으로 변환
      const content = data.content as Array<{ type: string; text: string }> | undefined;
      const usage = data.usage as { input_tokens: number; output_tokens: number } | undefined;
      return {
        id: data.id,
        object: 'chat.completion',
        model: data.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: content?.[0]?.text || '',
          },
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
      const usage = data.usage as { input_tokens: number; output_tokens: number } | undefined;
      return {
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
      };
    },
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    getHeaders: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    transformRequest: (body: Record<string, unknown>) => body,
    transformResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;
      return {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
      };
    },
  },
  xai: {
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    getHeaders: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    transformRequest: (body: Record<string, unknown>) => body,
    transformResponse: (data: Record<string, unknown>) => data,
    extractUsage: (data: Record<string, unknown>) => {
      const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;
      return {
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
      };
    },
  },
};

// Provider별 API Key 환경변수
const PROVIDER_API_KEYS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  xai: process.env.XAI_API_KEY,
};

interface UnifiedResult {
  response: Response;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  cost?: {
    providerCost: number;
    margin: number;
    totalCost: number;
  };
}

export async function handleUnifiedRequest(
  request: Request
): Promise<UnifiedResult | { error: string; status: number }> {
  const startTime = Date.now();

  // API Key 검증
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization header is required', status: 401 };
  }

  const apiKey = authHeader.replace('Bearer ', '');
  const keyResult = await verifyApiKey(apiKey);
  if (!keyResult.valid || !keyResult.orgId) {
    return { error: 'Invalid API key', status: 401 };
  }

  // 요청 본문 파싱
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { error: 'Invalid JSON body', status: 400 };
  }

  const model = body.model as string;
  if (!model) {
    return { error: 'model is required', status: 400 };
  }

  // Provider 라우팅
  const routing = getProviderFromModel(model);
  if (!routing) {
    return {
      error: `Unknown model: ${model}`,
      status: 400,
    };
  }

  const { provider, actualModel } = routing;
  const config = PROVIDER_CONFIG[provider as keyof typeof PROVIDER_CONFIG];
  const providerApiKey = PROVIDER_API_KEYS[provider];

  if (!config || !providerApiKey) {
    return {
      error: `Provider ${provider} is not configured`,
      status: 500,
    };
  }

  // 요청 변환 (model을 실제 model로 교체)
  const transformedBody = config.transformRequest({
    ...body,
    model: actualModel,
  });

  // Provider로 요청 전송
  const proxyResponse = await fetch(config.baseUrl, {
    method: 'POST',
    headers: config.getHeaders(providerApiKey),
    body: JSON.stringify(transformedBody),
  });

  const latencyMs = Date.now() - startTime;

  // 응답 처리
  const responseData = await proxyResponse.json();

  if (!proxyResponse.ok) {
    // 에러 응답을 OpenAI 형식으로 변환
    return {
      response: new Response(
        JSON.stringify({
          error: {
            message: (responseData.error as { message?: string })?.message || 'Provider error',
            type: 'provider_error',
            code: proxyResponse.status.toString(),
          },
        }),
        {
          status: proxyResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  // Usage 추출
  const usage = config.extractUsage(responseData);

  // 비용 계산
  const cost = await calculateCost(provider, actualModel, usage.inputTokens, usage.outputTokens);

  if (cost) {
    // 잔액 확인 및 차감
    const deducted = await deductBalance(
      keyResult.orgId,
      cost.totalCost,
      `API call: ${provider}/${actualModel}`
    );

    if (!deducted) {
      return {
        error: 'Insufficient balance',
        status: 402,
      };
    }

    // 사용량 로깅
    await prisma.usageLog.create({
      data: {
        orgId: keyResult.orgId,
        apiKeyId: keyResult.keyId,
        provider,
        model: actualModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        providerCost: cost.providerCost,
        margin: cost.margin,
        totalCost: cost.totalCost,
        endpoint: 'chat/completions',
        latencyMs,
        statusCode: proxyResponse.status,
        mode: 'reseller',
      },
    });
  }

  // 응답 변환
  const transformedResponse = config.transformResponse(responseData);

  return {
    response: new Response(JSON.stringify(transformedResponse), {
      status: proxyResponse.status,
      headers: { 'Content-Type': 'application/json' },
    }),
    usage,
    cost: cost || undefined,
  };
}
