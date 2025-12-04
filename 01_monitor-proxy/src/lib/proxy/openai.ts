import { prisma } from "@/lib/prisma"
import { calculateCost } from "@/lib/pricing"
import bcrypt from "bcryptjs"

const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface OpenAIResponse {
  id: string
  object: string
  model: string
  usage?: OpenAIUsage
  [key: string]: unknown
}

export async function validateMonitorToken(token: string): Promise<string | null> {
  const tokens = await prisma.monitorToken.findMany({
    where: { isActive: true },
    include: { org: true },
  })

  for (const t of tokens) {
    const isValid = await bcrypt.compare(token, t.tokenHash)
    if (isValid) {
      // Update last used
      await prisma.monitorToken.update({
        where: { id: t.id },
        data: { lastUsedAt: new Date() },
      })
      return t.orgId
    }
  }

  return null
}

export async function proxyOpenAIRequest(
  path: string,
  method: string,
  headers: Headers,
  body: string | null,
  orgId: string
): Promise<Response> {
  const startTime = Date.now()

  // Build target URL
  const targetUrl = `${OPENAI_BASE_URL}/${path}`

  // Forward headers (excluding host and monitor token)
  const forwardHeaders = new Headers()
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey !== "host" &&
      lowerKey !== "x-monitor-token" &&
      lowerKey !== "content-length"
    ) {
      forwardHeaders.set(key, value)
    }
  })

  // Parse body to get model info
  let requestModel = "unknown"
  let isStreaming = false
  if (body) {
    try {
      const parsedBody = JSON.parse(body)
      requestModel = parsedBody.model || "unknown"
      isStreaming = parsedBody.stream === true
    } catch {
      // Ignore parse errors
    }
  }

  // Make request to OpenAI
  const response = await fetch(targetUrl, {
    method,
    headers: forwardHeaders,
    body: body || undefined,
  })

  const latencyMs = Date.now() - startTime

  // Handle streaming responses
  if (isStreaming && response.body) {
    return handleStreamingResponse(
      response,
      orgId,
      requestModel,
      path,
      latencyMs
    )
  }

  // Handle non-streaming responses
  const responseBody = await response.text()

  // Extract usage and save log
  try {
    const jsonResponse: OpenAIResponse = JSON.parse(responseBody)

    if (jsonResponse.usage) {
      const cost = await calculateCost("openai", jsonResponse.model || requestModel, {
        inputTokens: jsonResponse.usage.prompt_tokens,
        outputTokens: jsonResponse.usage.completion_tokens,
      })

      await prisma.usageLog.create({
        data: {
          orgId,
          provider: "openai",
          model: jsonResponse.model || requestModel,
          inputTokens: jsonResponse.usage.prompt_tokens,
          outputTokens: jsonResponse.usage.completion_tokens,
          estimatedCost: cost,
          endpoint: path,
          isStreaming: false,
          latencyMs,
          statusCode: response.status,
        },
      })
    }
  } catch {
    // Log error without usage if JSON parse fails
    console.error("Failed to parse OpenAI response for usage tracking")
  }

  // Return response to client
  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  })
}

async function handleStreamingResponse(
  response: Response,
  orgId: string,
  model: string,
  endpoint: string,
  latencyMs: number
): Promise<Response> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  let inputTokens = 0
  let outputTokens = 0
  let actualModel = model

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            controller.close()

            // Save usage log after stream completes
            if (inputTokens > 0 || outputTokens > 0) {
              const cost = await calculateCost("openai", actualModel, {
                inputTokens,
                outputTokens,
              })

              await prisma.usageLog.create({
                data: {
                  orgId,
                  provider: "openai",
                  model: actualModel,
                  inputTokens,
                  outputTokens,
                  estimatedCost: cost,
                  endpoint,
                  isStreaming: true,
                  latencyMs,
                  statusCode: response.status,
                },
              })
            }
            break
          }

          // Pass through the chunk
          controller.enqueue(value)

          // Parse SSE data to extract usage
          const text = decoder.decode(value, { stream: true })
          const lines = text.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.model) {
                  actualModel = data.model
                }

                // OpenAI includes usage in the final chunk when stream_options.include_usage is true
                if (data.usage) {
                  inputTokens = data.usage.prompt_tokens || inputTokens
                  outputTokens = data.usage.completion_tokens || outputTokens
                }
              } catch {
                // Ignore parse errors for individual chunks
              }
            }
          }
        }
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
