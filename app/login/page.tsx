'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AUTH_KEY } from '@/lib/client'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    try {
      if (localStorage.getItem(AUTH_KEY)) router.replace('/')
    } catch {}
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.token) {
        localStorage.setItem(AUTH_KEY, json.token)
        router.replace('/')
        return
      }
      setError(res.status === 401 ? 'パスワードが違います' : json?.error || 'ログインに失敗しました')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">🍳🏠🌙</div>
        <h1>ふたりの当番表</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            共有パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
