import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { generateApiKey } from '@/lib/api-key'

// GET - List all API keys
export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { orgId: session.userId },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error('Get API keys error:', error)
    return NextResponse.json(
      { error: 'API 키 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { name } = await request.json().catch(() => ({}))

    const { key, hash, prefix } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        orgId: session.userId,
        keyHash: hash,
        keyPrefix: prefix,
        name: name || null,
      },
    })

    // Return the full key only once during creation
    return NextResponse.json({
      message: 'API 키가 생성되었습니다.',
      apiKey: {
        id: apiKey.id,
        key, // Full key - only shown once
        keyPrefix: apiKey.keyPrefix,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      },
    })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json(
      { error: 'API 키 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
