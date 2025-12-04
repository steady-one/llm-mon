import { prisma } from '../prisma';
import { verifyMonitorToken } from '../auth';
import { estimateCost } from '../pricing';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

interface ProxyResult {
  response: Response;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
  latencyMs?: number;
}

export async function proxyOpenAI(
  request: Request,
  path: string[]
): Promise<ProxyResult | { error: string; status: number }> {
  const startTime = Date.now();

  // Monitor Token 확인
  const monitorToken = request.headers.get('X-Monitor-Token');
  if (!monitorToken) {
    return { error: 'X-Monitor-Token header is required', status: 401 };
  }

  const tokenResult = await verifyMonitorToken(monitorToken);
  if (!tokenResult.valid) {
    return { error: 'Invalid monitor token', status: 401 };
  }

  // OpenAI API Key 확인
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Authorization header is required', status: 401 };
  }

  // 요청 URL 구성
  const endpoint = path.join('/');
  const targetUrl = `${OPENAI_BASE_URL}/${endpoint}`;

  // 요청 헤더 준비 (Monitor Token 제외)
  const headers = new Headers();
  headers.set('Authorization', authHeader);
  headers.set('Content-Type', 'application/json');

  // 요청 본문 가져오기
  let body: string | undefined;
  let requestModel: string | undefined;

  if (request.method !== 'GET') {
    body = await request.text();
    try {
      const parsed = JSON.parse(body);
      requestModel = parsed.model;
    } catch {
      // JSON 파싱 실패시 무시
    }
  }

  // OpenAI로 요청 전달
  const proxyResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const latencyMs = Date.now() - startTime;

  // 응답 처리
  const responseBody = await proxyResponse.text();
  let usage: { inputTokens: number; outputTokens: number } | undefined;
  let responseModel: string | undefined;

  try {
    const responseData = JSON.parse(responseBody);
    if (responseData.usage) {
      usage = {
        inputTokens: responseData.usage.prompt_tokens || 0,
        outputTokens: responseData.usage.completion_tokens || 0,
      };
    }
    responseModel = responseData.model;
  } catch {
    // JSON 파싱 실패시 무시
  }

  const finalModel = responseModel || requestModel;

  // 사용량 로깅
  if (usage && tokenResult.orgId && finalModel) {
    const cost = await estimateCost('openai', finalModel, usage.inputTokens, usage.outputTokens);

    await prisma.usageLog.create({
      data: {
        orgId: tokenResult.orgId,
        provider: 'openai',
        model: finalModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCost: cost,
        endpoint,
        latencyMs,
        statusCode: proxyResponse.status,
        mode: 'passthrough',
      },
    });
  }

  // 응답 반환
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');

  return {
    response: new Response(responseBody, {
      status: proxyResponse.status,
      headers: responseHeaders,
    }),
    usage,
    model: finalModel,
    latencyMs,
  };
}
