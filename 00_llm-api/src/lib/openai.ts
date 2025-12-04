// OpenAI Usage API 연동
// 참고: https://platform.openai.com/docs/api-reference/usage

export interface OpenAIUsageBucket {
  object: string
  input_tokens: number
  output_tokens: number
  num_model_requests: number
  project_id: string | null
  user_id: string | null
  api_key_id: string | null
  model: string | null
  batch: boolean | null
  start_time: number
  end_time: number
}

export interface OpenAIUsageResponse {
  object: string
  data: OpenAIUsageBucket[]
  has_more: boolean
  next_page: string | null
}

// OpenAI 모델별 가격 (USD per 1M tokens) - 2024년 기준
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o1-preview': { input: 15, output: 60 },
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 }
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}

export async function fetchOpenAIUsage(
  apiKey: string,
  startTime: number,
  endTime: number,
  bucketWidth: '1m' | '1h' | '1d' = '1d'
): Promise<OpenAIUsageResponse> {
  const url = new URL('https://api.openai.com/v1/organization/usage/completions')
  url.searchParams.set('start_time', startTime.toString())
  url.searchParams.set('end_time', endTime.toString())
  url.searchParams.set('bucket_width', bucketWidth)
  url.searchParams.set('group_by', 'model')

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `API Error: ${response.status}`)
  }

  return response.json()
}

export async function testOpenAIConnection(apiKey: string): Promise<{ valid: boolean; isAdmin: boolean }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

  try {
    // Admin API Key 테스트 (Usage API)
    try {
      const now = Math.floor(Date.now() / 1000)
      const oneDayAgo = now - 86400

      const url = new URL('https://api.openai.com/v1/organization/usage/completions')
      url.searchParams.set('start_time', oneDayAgo.toString())
      url.searchParams.set('end_time', now.toString())

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      })

      if (response.ok) {
        return { valid: true, isAdmin: true }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw e // 타임아웃은 상위로 전파
      }
      // Admin key 테스트 실패, 일반 key로 시도
    }

    // 일반 API Key 테스트
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      })

      if (response.ok) {
        return { valid: true, isAdmin: false }
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw e
      }
      // 일반 key 테스트 실패
    }

    return { valid: false, isAdmin: false }
  } finally {
    clearTimeout(timeout)
  }
}
