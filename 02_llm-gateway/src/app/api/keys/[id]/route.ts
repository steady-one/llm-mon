import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// DELETE - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { id } = await params

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        orgId: session.userId,
      },
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    await prisma.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'API 키가 삭제되었습니다.' })
  } catch (error) {
    console.error('Delete API key error:', error)
    return NextResponse.json(
      { error: 'API 키 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH - Update API key (toggle active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { isActive, name } = await request.json()

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        orgId: session.userId,
      },
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(name !== undefined && { name }),
      },
    })

    return NextResponse.json({
      message: 'API 키가 업데이트되었습니다.',
      apiKey: {
        id: updated.id,
        keyPrefix: updated.keyPrefix,
        name: updated.name,
        isActive: updated.isActive,
      },
    })
  } catch (error) {
    console.error('Update API key error:', error)
    return NextResponse.json(
      { error: 'API 키 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
