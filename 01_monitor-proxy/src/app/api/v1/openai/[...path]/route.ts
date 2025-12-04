import { NextRequest, NextResponse } from "next/server"
import { validateMonitorToken, proxyOpenAIRequest } from "@/lib/proxy/openai"

async function handleRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const path = params.path.join("/")

  // Get monitor token from header
  const monitorToken = request.headers.get("X-Monitor-Token")

  if (!monitorToken) {
    return NextResponse.json(
      { error: "Missing X-Monitor-Token header" },
      { status: 401 }
    )
  }

  // Validate monitor token
  const orgId = await validateMonitorToken(monitorToken)

  if (!orgId) {
    return NextResponse.json(
      { error: "Invalid monitor token" },
      { status: 401 }
    )
  }

  // Get request body
  let body: string | null = null
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text()
  }

  try {
    // Proxy the request
    const response = await proxyOpenAIRequest(
      path,
      request.method,
      request.headers,
      body,
      orgId
    )

    return response
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { error: "Failed to proxy request to OpenAI" },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context)
}
