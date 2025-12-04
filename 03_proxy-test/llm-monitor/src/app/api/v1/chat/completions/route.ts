import { NextRequest, NextResponse } from 'next/server';
import { handleUnifiedRequest } from '@/lib/proxy/unified';

export async function POST(request: NextRequest) {
  const result = await handleUnifiedRequest(request);

  if ('error' in result) {
    return NextResponse.json(
      {
        error: {
          message: result.error,
          type: 'invalid_request_error',
          code: result.status.toString(),
        },
      },
      { status: result.status }
    );
  }

  return result.response;
}
