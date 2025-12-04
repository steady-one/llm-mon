import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatCompletionRequest {
  model: string
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function createChatCompletion(
  request: ChatCompletionRequest
): Promise<{ response: ChatCompletionResponse; latencyMs: number }> {
  const startTime = Date.now()

  const completion = await openai.chat.completions.create({
    model: request.model,
    messages: request.messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    frequency_penalty: request.frequency_penalty,
    presence_penalty: request.presence_penalty,
    stop: request.stop,
  })

  const latencyMs = Date.now() - startTime

  const response: ChatCompletionResponse = {
    id: completion.id,
    object: completion.object,
    created: completion.created,
    model: completion.model,
    choices: completion.choices.map((choice) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || '',
      },
      finish_reason: choice.finish_reason || 'stop',
    })),
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens || 0,
      completion_tokens: completion.usage?.completion_tokens || 0,
      total_tokens: completion.usage?.total_tokens || 0,
    },
  }

  return { response, latencyMs }
}
