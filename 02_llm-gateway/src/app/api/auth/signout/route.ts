import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  try {
    const session = await getSession()
    session.destroy()

    return NextResponse.json({ message: '로그아웃 되었습니다.' })
  } catch (error) {
    console.error('Signout error:', error)
    return NextResponse.json(
      { error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
