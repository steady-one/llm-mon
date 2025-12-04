import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashApiKey, validateApiKeyFormat } from '@/lib/api-key'
import { calculateCost } from '@/lib/billing'
import { createChatCompletion, ChatCompletionRequest } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    // 1. Extract API key from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Missing or invalid Authorization header', type: 'invalid_request_error' } },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer '

    // 2. Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      return NextResponse.json(
        { error: { message: 'Invalid API key format', type: 'invalid_request_error' } },
        { status: 401 }
      )
    }

    // 3. Find API key in database
    const keyHash = hashApiKey(apiKey)
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
      },
      include: {
        organization: {
          include: {
            balance: true,
          },
        },
      },
    })

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: { message: 'Invalid API key', type: 'invalid_request_error' } },
        { status: 401 }
      )
    }

    const org = apiKeyRecord.organization
    const balance = org.balance

    // 4. Check balance
    if (!balance || balance.amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Insufficient balance. Please add credits.', type: 'insufficient_quota' } },
        { status: 402 }
      )
    }

    // 5. Parse request body
    const body: ChatCompletionRequest = await request.json()

    if (!body.model || !body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: { message: 'Invalid request: model and messages are required', type: 'invalid_request_error' } },
        { status: 400 }
      )
    }

    // 6. Call OpenAI API
    let response, latencyMs
    try {
      const result = await createChatCompletion(body)
      response = result.response
      latencyMs = result.latencyMs
    } catch (openaiError: unknown) {
      console.error('OpenAI API error:', openaiError)
      const errorMessage = openaiError instanceof Error ? openaiError.message : 'Unknown error'
      return NextResponse.json(
        { error: { message: `OpenAI API error: ${errorMessage}`, type: 'api_error' } },
        { status: 502 }
      )
    }

    // 7. Calculate cost
    const { providerCost, margin, totalCost } = calculateCost(
      response.model,
      response.usage.prompt_tokens,
      response.usage.completion_tokens
    )

    // 8. Check if balance is sufficient for this request
    if (balance.amount < totalCost) {
      return NextResponse.json(
        { error: { message: 'Insufficient balance for this request', type: 'insufficient_quota' } },
        { status: 402 }
      )
    }

    // 9. Deduct balance and record usage (in transaction)
    const newBalance = balance.amount - totalCost

    await prisma.$transaction([
      // Update balance
      prisma.balance.update({
        where: { id: balance.id },
        data: { amount: newBalance },
      }),
      // Record balance transaction
      prisma.balanceTransaction.create({
        data: {
          orgId: org.id,
          type: 'usage',
          amount: -totalCost,
          balanceAfter: newBalance,
          description: `API usage: ${response.model} (${response.usage.total_tokens} tokens)`,
        },
      }),
      // Record usage log
      prisma.usageLog.create({
        data: {
          orgId: org.id,
          apiKeyId: apiKeyRecord.id,
          model: response.model,
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          providerCost,
          margin,
          totalCost,
          latencyMs,
        },
      }),
    ])

    // 10. Return response (OpenAI compatible format)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat completions error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error', type: 'api_error' } },
      { status: 500 }
    )
  }
}
