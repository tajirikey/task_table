import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/auth'
import { normalizeData, type AppData } from '@/lib/types'

const DATA_KEY = 'task_table_data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Vercel の Storage（Upstash for Redis）連携で注入される環境変数。
// 接続時のプレフィックス設定によって名前が変わるため両方に対応する。
function kvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

function isKvAvailable() {
  return !!kvConfig()
}

// KV未設定時の開発用フォールバック（同一プロセス内のみ有効）
let memoryStore: any = null

async function getKv() {
  const cfg = kvConfig()
  if (!cfg) return null
  try {
    const { createClient } = await import('@vercel/kv')
    return createClient(cfg)
  } catch (e) {
    console.error('Vercel KV import failed:', e)
    return null
  }
}

async function load(): Promise<AppData> {
  const kv = await getKv()
  const raw = kv ? await kv.get(DATA_KEY) : memoryStore
  return normalizeData(raw)
}

async function store(data: AppData) {
  const kv = await getKv()
  if (kv) await kv.set(DATA_KEY, data)
  else memoryStore = data
}

function unauthorized() {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get('x-app-token'))) return unauthorized()
  try {
    const data = await load()
    return NextResponse.json({ data, source: isKvAvailable() ? 'kv' : 'memory' })
  } catch (error) {
    console.error('Data fetch error:', error)
    return NextResponse.json({ data: null, error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

// 2人が同時に別の日を編集しても上書きし合わないよう、
// 全体ではなく「1日分」または「メンバー設定」だけを送ってサーバー側でマージする。
//   { day: { id: 'YYYY-MM-DD', value: Day | null } }
//   { members: { a: Member, b: Member } }
export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get('x-app-token'))) return unauthorized()
  try {
    const body = await request.json().catch(() => ({}))
    const data = await load()

    if (body?.day && typeof body.day.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.day.id)) {
      const value = body.day.value
      if (value && typeof value === 'object' && Object.keys(value).length) data.days[body.day.id] = value
      else delete data.days[body.day.id]
    } else if (body?.members && typeof body.members === 'object') {
      data.members = normalizeData({ members: body.members }).members
    } else {
      return NextResponse.json({ success: false, error: 'リクエストが不正です' }, { status: 400 })
    }

    await store(data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Data save error:', error)
    return NextResponse.json({ success: false, error: '保存に失敗しました' }, { status: 500 })
  }
}
