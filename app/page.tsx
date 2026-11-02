'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AUTH_KEY } from '@/lib/client'
import {
  defaultData, normalizeData,
  type AppData, type Day, type DinnerValue, type DutyValue, type Member, type MemberKey,
} from '@/lib/types'

const TASKS = {
  dinner: { icon: '🍳', label: '夕飯' },
  duty: { icon: '🏠', label: '在宅当番' },
} as const
const AWAY_BG = '#2d2f4a'
const WD = '日月火水木金土'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function bgFor(members: AppData['members'], v?: string): string | undefined {
  if (v === 'a' || v === 'b') return members[v].color
  if (v === 'both') return `linear-gradient(90deg, ${members.a.color} 50%, ${members.b.color} 50%)`
  return undefined
}

function whoLabel(members: AppData['members'], v?: string): string {
  if (v === 'a' || v === 'b') return `${members[v].emoji} ${members[v].name}`
  if (v === 'both') return `👫 ふたり`
  if (v === 'none') return 'なし'
  return ''
}

/* ---------- カレンダー内の小さな札 ---------- */
function Pill({ task, value, members }: { task: keyof typeof TASKS; value?: string; members: AppData['members'] }) {
  if (!value) return null
  const bg = bgFor(members, value)
  const person = value === 'a' || value === 'b' ? members[value] : null
  const emo = person ? person.emoji : value === 'both' ? '👫' : ''
  const nm = person ? person.name : value === 'both' ? '2人' : 'なし'
  return (
    <span className={bg ? 'pill' : 'pill none'} style={bg ? { background: bg } : undefined}
      title={`${TASKS[task].label}：${whoLabel(members, value)}`}>
      <span className="ti">{TASKS[task].icon}</span>{emo}<span className="nm">{nm}</span>
    </span>
  )
}

function AwayPill({ m }: { m: Member }) {
  return (
    <span className="pill away" style={{ boxShadow: `inset 4px 0 0 ${m.color}` }} title={`夜不在：${m.name}`}>
      <span className="ti">🌙</span>{m.emoji}<span className="nm">{m.name}</span>
    </span>
  )
}

/* ---------- 選択ボタン ---------- */
function Seg<T extends string>({ options, isOn, onToggle, onBg }: {
  options: { value: T; label: string }[]
  isOn: (v: T) => boolean
  onToggle: (v: T) => void
  onBg: (v: T) => string
}) {
  return (
    <div className="seg">
      {options.map((o) => {
        const on = isOn(o.value)
        return (
          <button key={o.value} type="button" className={on ? 'on' : ''}
            style={on ? { background: onBg(o.value) } : undefined}
            onClick={() => onToggle(o.value)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- 日付編集 ---------- */
function DayEditor({ id, initial, members, onSave, onClose }: {
  id: string; initial: Day; members: AppData['members']
  onSave: (d: Day) => void; onClose: () => void
}) {
  const [dinner, setDinner] = useState<DinnerValue | undefined>(initial.dinner)
  const [duty, setDuty] = useState<DutyValue | undefined>(initial.duty)
  const [away, setAway] = useState<MemberKey[]>(initial.away || [])
  const [memo, setMemo] = useState(initial.memo || '')
  const [y, m, d] = id.split('-').map(Number)
  const wd = WD[new Date(y, m - 1, d).getDay()]
  const people: { value: MemberKey; label: string }[] = [
    { value: 'a', label: `${members.a.emoji} ${members.a.name}` },
    { value: 'b', label: `${members.b.emoji} ${members.b.name}` },
  ]
  const bg = (v: string) => bgFor(members, v) || '#8a857c'

  const save = () => {
    const out: Day = {}
    if (dinner) out.dinner = dinner
    if (duty) out.duty = duty
    if (away.length) out.away = [...away].sort() as MemberKey[]
    if (memo.trim()) out.memo = memo.trim()
    onSave(out)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{m}月{d}日（{wd}）</h3>

        <fieldset>
          <legend>🍳 夕飯</legend>
          <Seg<DinnerValue>
            options={[...people, { value: 'both', label: '👫 ふたり' }, { value: 'none', label: 'なし' }]}
            isOn={(v) => dinner === v}
            onToggle={(v) => setDinner(dinner === v ? undefined : v)}
            onBg={bg} />
        </fieldset>

        <fieldset>
          <legend>🏠 在宅当番</legend>
          <Seg<DutyValue>
            options={[...people, { value: 'none', label: 'なし' }]}
            isOn={(v) => duty === v}
            onToggle={(v) => setDuty(duty === v ? undefined : v)}
            onBg={bg} />
        </fieldset>

        <fieldset>
          <legend>🌙 夜いない人</legend>
          <Seg<MemberKey>
            options={people}
            isOn={(v) => away.includes(v)}
            onToggle={(v) => setAway(away.includes(v) ? away.filter((x) => x !== v) : [...away, v])}
            onBg={() => AWAY_BG} />
        </fieldset>

        <label className="memo">メモ
          <input type="text" value={memo} maxLength={40} placeholder="例：19時帰宅" onChange={(e) => setMemo(e.target.value)} />
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={() => { setDinner(undefined); setDuty(undefined); setAway([]); setMemo('') }}>クリア</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="button" className="btn primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 設定 ---------- */
function SettingsEditor({ members, onSave, onClose, onLogout }: {
  members: AppData['members']; onSave: (m: AppData['members']) => void; onClose: () => void; onLogout: () => void
}) {
  const [draft, setDraft] = useState(members)
  const set = (k: MemberKey, field: keyof Member, v: string) => setDraft({ ...draft, [k]: { ...draft[k], [field]: v } })
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>設定</h3>
        {(['a', 'b'] as MemberKey[]).map((k, i) => (
          <div className="member-row" key={k}>
            <label>{i + 1}人目の名前<input type="text" maxLength={8} value={draft[k].name} onChange={(e) => set(k, 'name', e.target.value)} /></label>
            <label>アイコン<input type="text" className="emoji" maxLength={4} value={draft[k].emoji} onChange={(e) => set(k, 'emoji', e.target.value)} /></label>
            <label>色<input type="color" value={draft[k].color} onChange={(e) => set(k, 'color', e.target.value)} /></label>
          </div>
        ))}
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onLogout}>ログアウト</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="button" className="btn primary" onClick={() => onSave({
            a: { name: draft.a.name.trim() || '?', emoji: draft.a.emoji.trim() || '🙂', color: draft.a.color },
            b: { name: draft.b.name.trim() || '?', emoji: draft.b.emoji.trim() || '🙂', color: draft.b.color },
          })}>保存</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- メイン ---------- */
export default function Home() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [editing, setEditing] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busy = useRef(false) // 編集中・保存中はポーリング結果で上書きしない

  const toast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 1800)
  }

  const logout = useCallback(() => {
    try { localStorage.removeItem(AUTH_KEY) } catch {}
    router.replace('/login')
  }, [router])

  // 認証チェック
  useEffect(() => {
    let t: string | null = null
    try { t = localStorage.getItem(AUTH_KEY) } catch {}
    if (!t) { router.replace('/login'); return }
    setToken(t)
  }, [router])

  const fetchData = useCallback(async (initial = false) => {
    if (!token) return
    try {
      const res = await fetch('/api/data', { cache: 'no-store', headers: { 'x-app-token': token } })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error(`status=${res.status}`)
      const json = await res.json()
      if (busy.current && !initial) return
      const next = normalizeData(json.data ?? defaultData())
      setData((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      setLoadError('')
    } catch (e) {
      console.error('API読み込みエラー:', e)
      if (initial) setLoadError('データの取得に失敗しました')
    }
  }, [token, logout])

  useEffect(() => { if (token) fetchData(true) }, [token, fetchData])

  // ポーリングで他端末の更新を取得（5秒ごと）
  useEffect(() => {
    if (!token) return
    const iv = setInterval(() => fetchData(), 5000)
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [token, fetchData])

  useEffect(() => { busy.current = !!editing || settingsOpen }, [editing, settingsOpen])

  async function post(body: object, optimistic: AppData) {
    setData(optimistic)
    busy.current = true
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-app-token': token || '' },
        body: JSON.stringify(body),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error(`status=${res.status}`)
      const json = await res.json()
      if (json?.data) setData(normalizeData(json.data))
      toast('保存しました')
    } catch (e) {
      console.error('保存エラー:', e)
      toast('保存に失敗しました')
    } finally {
      busy.current = false
    }
  }

  function saveDay(id: string, value: Day) {
    if (!data) return
    const days = { ...data.days }
    if (Object.keys(value).length) days[id] = value
    else delete days[id]
    setEditing(null)
    post({ day: { id, value: Object.keys(value).length ? value : null } }, { ...data, days })
  }

  function saveMembers(members: AppData['members']) {
    if (!data) return
    setSettingsOpen(false)
    post({ members }, { ...data, members })
  }

  if (!token || !data) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">🍳🏠🌙</div>
          {loadError ? (
            <>
              <p className="error">{loadError}</p>
              <button className="btn primary" onClick={() => fetchData(true)}>再試行</button>
            </>
          ) : <p style={{ color: 'var(--muted)' }}>読み込み中...</p>}
        </div>
      </div>
    )
  }

  const { members, days } = data
  const now = new Date()
  const todayId = ymd(now)
  const today = days[todayId] || {}

  // カレンダーの範囲（日曜始まり）
  const start = new Date(month); start.setDate(1 - month.getDay())
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()))
  const cells: Date[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) cells.push(new Date(d))

  const moveMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  const todayItem = (task: keyof typeof TASKS, v?: string) => {
    const bg = bgFor(members, v)
    return (
      <span className="t-item" style={bg ? { background: bg, color: '#fff' } : undefined}>
        {TASKS[task].icon} {TASKS[task].label}：<b>{whoLabel(members, v) || '未定'}</b>
      </span>
    )
  }
  const awayText = (today.away || []).map((k) => `${members[k].emoji} ${members[k].name}`).join('・')

  return (
    <div className="view">
      <header className="topbar">
        <h1>ふたりの当番表</h1>
        <button className="icon-btn" title="設定" aria-label="設定" onClick={() => setSettingsOpen(true)}>⚙️</button>
      </header>

      <div className="today-card">
        <div className="t-head">今日 {now.getMonth() + 1}/{now.getDate()}（{WD[now.getDay()]}）</div>
        <div className="t-rows">
          {todayItem('dinner', today.dinner)}
          {todayItem('duty', today.duty)}
          <span className="t-item" style={awayText ? { background: AWAY_BG, color: '#fff' } : undefined}>
            🌙 夜不在：<b>{awayText || 'なし'}</b>
          </span>
        </div>
        {today.memo && <div className="t-memo">📝 {today.memo}</div>}
      </div>

      <div className="legend">
        <span><i className="sw" style={{ background: members.a.color }} />{members.a.emoji} {members.a.name}</span>
        <span><i className="sw" style={{ background: members.b.color }} />{members.b.emoji} {members.b.name}</span>
        <span><i className="sw" style={{ background: bgFor(members, 'both') }} />ふたり</span>
        <span>🍳 夕飯</span><span>🏠 在宅当番</span>
        <span><i className="sw" style={{ background: AWAY_BG }} />🌙 夜不在</span>
      </div>

      <div className="month-nav">
        <button className="icon-btn" aria-label="前の月" onClick={() => moveMonth(-1)}>◀</button>
        <h2>{month.getFullYear()}年 {month.getMonth() + 1}月</h2>
        <button className="icon-btn" aria-label="次の月" onClick={() => moveMonth(1)}>▶</button>
        <button className="btn small" onClick={() => { const d = new Date(); d.setDate(1); setMonth(d) }}>今日</button>
      </div>

      <div className="calendar">
        <div className="weekdays">
          {[...WD].map((w, i) => <div key={w} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{w}</div>)}
        </div>
        <div className="grid">
          {cells.map((d) => {
            const id = ymd(d)
            const v = days[id] || {}
            const cls = ['cell']
            if (d.getMonth() !== month.getMonth()) cls.push('other')
            if (id === todayId) cls.push('today')
            if (d.getDay() === 0) cls.push('sun')
            if (d.getDay() === 6) cls.push('sat')
            return (
              <button key={id} type="button" className={cls.join(' ')} onClick={() => setEditing(id)}>
                <span className="d">{d.getDate()}</span>
                <Pill task="dinner" value={v.dinner} members={members} />
                <Pill task="duty" value={v.duty} members={members} />
                {(v.away || []).map((k) => <AwayPill key={k} m={members[k]} />)}
                {v.memo && <span className="memo-dot">📝{v.memo}</span>}
              </button>
            )
          })}
        </div>
      </div>
      <p className="hint">日付をタップすると担当を編集できます（5秒ごとに自動同期）</p>

      {editing && (
        <DayEditor id={editing} initial={days[editing] || {}} members={members}
          onSave={(d) => saveDay(editing, d)} onClose={() => setEditing(null)} />
      )}
      {settingsOpen && (
        <SettingsEditor members={members} onSave={saveMembers}
          onClose={() => setSettingsOpen(false)} onLogout={() => { if (confirm('ログアウトしますか？')) logout() }} />
      )}
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">{toastMsg}</div>
    </div>
  )
}
