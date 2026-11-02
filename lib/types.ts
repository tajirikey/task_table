export type MemberKey = 'a' | 'b'
export type Member = { name: string; emoji: string; color: string }
export type DinnerValue = MemberKey | 'both' | 'none'
export type DutyValue = MemberKey | 'none'
export type Day = {
  dinner?: DinnerValue
  duty?: DutyValue
  away?: MemberKey[]
  awayNone?: boolean // 夜不在「なし」（誰もいなくならない）を明示
  memo?: string
}
export type AppData = {
  version: number
  members: Record<MemberKey, Member>
  days: Record<string, Day> // key: YYYY-MM-DD
}

// 夜不在を他のタスクと同じ値の形（a / b / both / none）にそろえる
export function awayValue(d?: Day): DinnerValue | undefined {
  const a = d?.away || []
  if (a.length >= 2) return 'both'
  if (a.length === 1) return a[0]
  if (d?.awayNone) return 'none'
  return undefined
}

export function defaultData(): AppData {
  return {
    version: 1,
    members: {
      a: { name: '夫', emoji: '👨', color: '#2f7bd6' },
      b: { name: '妻', emoji: '👩', color: '#e0577e' },
    },
    days: {},
  }
}

export function normalizeData(d: any): AppData {
  const def = defaultData()
  if (!d || typeof d !== 'object') return def
  const m = d.members || {}
  return {
    version: d.version || 1,
    members: {
      a: { ...def.members.a, ...(m.a || {}) },
      b: { ...def.members.b, ...(m.b || {}) },
    },
    days: d.days && typeof d.days === 'object' ? d.days : {},
  }
}
