import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { testOpenAIConnection } from '@/lib/openai'
import { maskApiKey } from '@/lib/utils'

// GET - 설정 조회
export async function GET() {
  try {
    const settings = await prisma.settings.findMany()

    // API Key 마스킹 처리
    const maskedSettings = settings.map(s => ({
      ...s,
      apiKey: maskApiKey(s.apiKey),
    }))

    return NextResponse.json({ success: true, data: maskedSettings })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - 설정 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, apiKey } = body

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      )
    }

    // OpenAI 연결 테스트
    let keyType = 'unknown'
    if (provider === 'openai') {
      const result = await testOpenAIConnection(apiKey)
      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key or connection failed' },
          { status: 400 }
        )
      }
      keyType = result.isAdmin ? 'admin' : 'standard'

      if (!result.isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Usage API 접근을 위해 Admin API Key가 필요합니다. https://platform.openai.com/settings/organization/admin-keys 에서 발급받으세요.' },
          { status: 400 }
        )
      }
    }

    // Upsert 처리
    const settings = await prisma.settings.upsert({
      where: { provider },
      update: { apiKey },
      create: { provider, apiKey },
    })

    return NextResponse.json({
      success: true,
      data: { ...settings, apiKey: maskApiKey(settings.apiKey), keyType },
    })
  } catch (error) {
    console.error('Settings POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

// DELETE - 설정 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      )
    }

    await prisma.settings.delete({
      where: { provider },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete settings' },
      { status: 500 }
    )
  }
}
