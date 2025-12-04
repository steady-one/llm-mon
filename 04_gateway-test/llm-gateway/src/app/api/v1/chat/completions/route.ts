import { NextRequest, NextResponse } from 'next/server';
import { handleGatewayRequest } from '@/lib/gateway';

export async function POST(request: NextRequest) {
  const result = await handleGatewayRequest(request);

  if ('error' in result) {
    return NextResponse.json(
      { error: { message: result.error, type: 'invalid_request_error' } },
      { status: result.status }
    );
  }

  return result.response;
}
