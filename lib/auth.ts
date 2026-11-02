import { createHash } from 'crypto'

// 共有パスワードから導出したトークン。ログイン成功時にクライアントへ渡し、
// データAPIの呼び出し時にヘッダー x-app-token で送り返してもらう。
export function expectedToken(): string | null {
  const pw = process.env.APP_PASSWORD
  if (!pw) return null
  return createHash('sha256').update(`task_table:${pw}`).digest('hex')
}

export function isAuthorized(token: string | null): boolean {
  const expected = expectedToken()
  return !!expected && token === expected
}
