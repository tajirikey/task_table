import { NextRequest, NextResponse } from 'next/server'
import { expectedToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password : ''

    const expected = process.env.APP_PASSWORD
    if (!expected) {
      console.error('APP_PASSWORD is not configured')
      return NextResponse.json(
        { success: false, error: 'サーバー側のパスワードが未設定です' },
        { status: 500 }
      )
    }

    if (password === expected) {
      return NextResponse.json({ success: true, token: expectedToken() })
    }
    return NextResponse.json(
      { success: false, error: 'パスワードが違います' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json({ success: false, error: '認証エラー' }, { status: 500 })
  }
}
