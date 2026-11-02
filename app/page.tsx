'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AUTH_KEY } from '@/lib/client'
import {
  awayValue, defaultData, normalizeData,
  type AppData, type Day, type DinnerValue, type DutyValue, type Member, type MemberKey,
} from '@/lib/types'

const TASKS = {
  dinner: { icon: '🍳', label: '夕飯' },
  duty: { icon: '🏠', label: '在宅当番' },
  away: { icon: '🌙', label: '夜不在' },
} as const
const WD = '日月火水木金土'
const WEEKEND_KEY = 'task_table_show_weekend'

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

/* ---------- 表のセルに入る担当者タグ ---------- */
function Tag({ value, members }: { value?: string; members: AppData['members'] }) {
  if (!value) return <span className="tag empty">－</span>
  const bg = bgFor(members, value)
  const person = value === 'a' || value === 'b' ? members[value] : null
  const emo = person ? person.emoji : ''
  const nm = person ? person.name : value === 'both' ? 'ふたり' : 'なし'
  return (
    <span className={bg ? 'tag' : 'tag none'} style={bg ? { background: bg } : undefined}>
      <span className="emo">{emo}</span><span className="nm">{nm}</span>
    </span>
  )
}

/* ---------- 選択ボタン ---------- */
function Seg<T extends string>({ options, isOn, onToggle, onBg }: {
  options: ({ value: T; label: string } | null)[] // null = 空き枠（列の位置をそろえるため）
  isOn: (v: T) => boolean
  onToggle: (v: T) => void
  onBg: (v: T) => string
}) {
  return (
    <div className="seg">
      {options.map((o, i) => {
        if (!o) return <span key={`blank-${i}`} className="seg-blank" />
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
  const [awayNone, setAwayNone] = useState(!!initial.awayNone && !(initial.away || []).length)
  const [memo, setMemo] = useState(initial.memo || '')
  const [y, m, d] = id.split('-').map(Number)
  const wd = WD[new Date(y, m - 1, d).getDay()]
  const people: { value: MemberKey; label: string }[] = [
    { value: 'a', label: `${members.a.emoji} ${members.a.name}` },
    { value: 'b', label: `${members.b.emoji} ${members.b.name}` },
  ]
  const NONE = { value: 'none' as const, label: 'なし' }
  const bg = (v: string) => bgFor(members, v) || '#8a857c'

  const save = () => {
    const out: Day = {}
    if (dinner) out.dinner = dinner
    if (duty) out.duty = duty
    if (away.length) out.away = [...away].sort() as MemberKey[]
    else if (awayNone) out.awayNone = true
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
            options={[...people, null]}
            isOn={(v) => dinner === v}
            onToggle={(v) => setDinner(dinner === v ? undefined : v)}
            onBg={bg} />
        </fieldset>

        <fieldset>
          <legend>🏠 在宅当番</legend>
          <Seg<DutyValue>
            options={[...people, NONE]}
            isOn={(v) => duty === v}
            onToggle={(v) => setDuty(duty === v ? undefined : v)}
            onBg={bg} />
        </fieldset>

        <fieldset>
          <legend>🌙 夜不在<small>（複数選択可）</small></legend>
          <Seg<MemberKey | 'none'>
            options={[...people, NONE]}
            isOn={(v) => (v === 'none' ? awayNone : away.includes(v))}
            onToggle={(v) => {
              if (v === 'none') { setAwayNone(!awayNone); setAway([]); return }
              setAwayNone(false)
              setAway(away.includes(v) ? away.filter((x) => x !== v) : [...away, v])
            }}
            onBg={bg} />
        </fieldset>

        <label className="memo">メモ
          <input type="text" value={memo} maxLength={40} placeholder="例：19時帰宅" onChange={(e) => setMemo(e.target.value)} />
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={() => { setDinner(undefined); setDuty(undefined); setAway([]); setAwayNone(false); setMemo('') }}>クリア</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="button" className="btn primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 設定 ---------- */
function SettingsEditor({ members, showWeekend, onSave, onClose, onLogout }: {
  members: AppData['members']; showWeekend: boolean
  onSave: (m: AppData['members'], showWeekend: boolean) => void; onClose: () => void; onLogout: () => void
}) {
  const [draft, setDraft] = useState(members)
  const [weekend, setWeekend] = useState(showWeekend)
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
        <label className="switch-row">
          <input type="checkbox" checked={weekend} onChange={(e) => setWeekend(e.target.checked)} />
          土日も表示する<small>（この端末だけの設定）</small>
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onLogout}>ログアウト</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="button" className="btn primary" onClick={() => onSave({
            a: { name: draft.a.name.trim() || '?', emoji: draft.a.emoji.trim() || '🙂', color: draft.a.color },
            b: { name: draft.b.name.trim() || '?', emoji: draft.b.emoji.trim() || '🙂', color: draft.b.color },
          }, weekend)}>保存</button>
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
  const [showWeekend, setShowWeekend] = useState(false) // 既定は土日を非表示
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

  // 土日表示の設定（端末ごと）
  useEffect(() => {
    try { setShowWeekend(localStorage.getItem(WEEKEND_KEY) === '1') } catch {}
  }, [])

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
    // 画面が表示されている間だけ同期する（Redis の無料枠を節約）
    const iv = setInterval(() => { if (!document.hidden) fetchData() }, 5000)
    const onVisible = () => { if (!document.hidden) fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
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

  function saveSettings(members: AppData['members'], weekend: boolean) {
    if (!data) return
    setSettingsOpen(false)
    setShowWeekend(weekend)
    try { localStorage.setItem(WEEKEND_KEY, weekend ? '1' : '0') } catch {}
    if (JSON.stringify(members) !== JSON.stringify(data.members)) post({ members }, { ...data, members })
    else toast('設定を保存しました')
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
  const weeks: Date[][] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) weeks.push([])
    const wd = d.getDay()
    if (showWeekend || (wd !== 0 && wd !== 6)) weeks[weeks.length - 1].push(new Date(d))
  }

  const moveMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  const todayItem = (task: keyof typeof TASKS, v?: string) => {
    const bg = bgFor(members, v)
    return (
      <span className="t-item" style={bg ? { background: bg, color: '#fff' } : undefined}>
        {TASKS[task].icon} {TASKS[task].label}：<b>{whoLabel(members, v) || '未定'}</b>
      </span>
    )
  }

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
          {todayItem('away', awayValue(today))}
        </div>
        {today.memo && <div className="t-memo">📝 {today.memo}</div>}
      </div>

      <div className="legend">
        <span><i className="sw" style={{ background: members.a.color }} />{members.a.emoji} {members.a.name}</span>
        <span><i className="sw" style={{ background: members.b.color }} />{members.b.emoji} {members.b.name}</span>
        <span><i className="sw" style={{ background: bgFor(members, 'both') }} />ふたり</span>
        <span><i className="sw" style={{ background: '#e9e6e0' }} />なし</span>
      </div>

      <div className="month-nav">
        <button className="icon-btn" aria-label="前の月" onClick={() => moveMonth(-1)}>◀</button>
        <h2>{month.getFullYear()}年 {month.getMonth() + 1}月</h2>
        <button className="icon-btn" aria-label="次の月" onClick={() => moveMonth(1)}>▶</button>
        <button className="btn small" onClick={() => { const d = new Date(); d.setDate(1); setMonth(d) }}>今日</button>
      </div>

      <div className="weeks">
        {weeks.map((week) => {
          const hasMemo = week.some((d) => days[ymd(d)]?.memo)
          const colCls = (d: Date) => {
            const c: string[] = []
            if (d.getMonth() !== month.getMonth()) c.push('other')
            if (ymd(d) === todayId) c.push('today')
            if (d.getDay() === 0) c.push('sun')
            if (d.getDay() === 6) c.push('sat')
            return c.join(' ')
          }
          const td = (d: Date, content: React.ReactNode) => {
            const id = ymd(d)
            return (
              <td key={id} className={colCls(d)}>
                <button type="button" className="td-btn" onClick={() => setEditing(id)}>{content}</button>
              </td>
            )
          }
          return (
            <div className="week" key={ymd(week[0])}>
              <table className={showWeekend ? 'tbl seven' : 'tbl'}>
                <thead>
                  <tr>
                    <th className="lbl" />
                    {week.map((d) => (
                      <th key={ymd(d)} className={colCls(d)}>
                        <button type="button" className="td-btn" onClick={() => setEditing(ymd(d))}>
                          {d.getDate()}<small>({WD[d.getDay()]})</small>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="lbl">🍳 夕飯</th>
                    {week.map((d) => td(d, <Tag value={days[ymd(d)]?.dinner} members={members} />))}
                  </tr>
                  <tr>
                    <th className="lbl">🏠 在宅当番</th>
                    {week.map((d) => td(d, <Tag value={days[ymd(d)]?.duty} members={members} />))}
                  </tr>
                  <tr>
                    <th className="lbl">🌙 夜不在</th>
                    {week.map((d) => td(d, <Tag value={awayValue(days[ymd(d)])} members={members} />))}
                  </tr>
                  {hasMemo && (
                    <tr className="memo-row">
                      <th className="lbl">📝 メモ</th>
                      {week.map((d) => td(d, <span className="memo-txt">{days[ymd(d)]?.memo || ''}</span>))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <p className="hint">マスをタップすると担当を編集できます（5秒ごとに自動同期）</p>

      {editing && (
        <DayEditor id={editing} initial={days[editing] || {}} members={members}
          onSave={(d) => saveDay(editing, d)} onClose={() => setEditing(null)} />
      )}
      {settingsOpen && (
        <SettingsEditor members={members} showWeekend={showWeekend} onSave={saveSettings}
          onClose={() => setSettingsOpen(false)} onLogout={() => { if (confirm('ログアウトしますか？')) logout() }} />
      )}
      <div className={`toast ${toastMsg ? 'show' : ''}`} role="status">{toastMsg}</div>
    </div>
  )
}
