export type MemberKey = 'a' | 'b'
export type Member = { name: string; emoji: string; color: string }
export type DinnerValue = MemberKey | 'both' | 'none'
export type DutyValue = MemberKey | 'none'
export type Day = {
  dinner?: DinnerValue
  duty?: DutyValue
  away?: MemberKey[]
  memo?: string
}
export type AppData = {
  version: number
  members: Record<MemberKey, Member>
  days: Record<string, Day> // key: YYYY-MM-DD
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
