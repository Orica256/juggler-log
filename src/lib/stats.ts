/**
 * 履歴の集計
 *
 * 画面に出す前の計算をここに集める。純関数にしておき、集計の正しさをテストで固定する。
 * 実戦中(status: 'active')のセッションは収支が確定していないため、すべての集計から除く。
 */
import { medalsToYen, profit, workedHours } from './calc'
import type { Session } from '../types'

export interface Summary {
  /** 集計対象の台数 */
  count: number
  profit: number
  invest: number
  /** 回収額(円) */
  payout: number
  /** 勝った台数 */
  wins: number
  /** 勝率(0〜1)。1台も無ければ null */
  winRate: number | null
  /** 実働時間の合計 */
  hours: number
  /** 平均時給。実働時間が0なら null */
  hourly: number | null
  /** 自分が回した総G数 */
  games: number
}

/** 集計の単位。棒グラフや一覧の1項目になる */
export interface Bucket extends Summary {
  key: string
  label: string
}

export function isCountable(session: Session): boolean {
  return session.status === 'finished'
}

export function summarize(sessions: Session[]): Summary {
  const target = sessions.filter(isCountable)
  const totalProfit = target.reduce((sum, s) => sum + profit(s), 0)
  const hours = target.reduce((sum, s) => sum + workedHours(s.startedAt, s.endedAt), 0)
  const wins = target.filter((s) => profit(s) > 0).length

  return {
    count: target.length,
    profit: totalProfit,
    invest: target.reduce((sum, s) => sum + s.invest, 0),
    payout: target.reduce((sum, s) => sum + medalsToYen(s.payoutMedals, s.exchangeRate), 0),
    wins,
    winRate: target.length > 0 ? wins / target.length : null,
    hours,
    hourly: hours > 0 ? Math.round(totalProfit / hours) : null,
    games: target.reduce((sum, s) => sum + s.myCount.games, 0),
  }
}

/**
 * 任意のキーでまとめる。
 * label が同じでもキーが違えば別項目として扱う(店名が空のものなど)。
 */
export function groupBy(
  sessions: Session[],
  keyOf: (session: Session) => { key: string; label: string },
): Bucket[] {
  const groups = new Map<string, { label: string; items: Session[] }>()

  for (const session of sessions.filter(isCountable)) {
    const { key, label } = keyOf(session)
    const found = groups.get(key)
    if (found) found.items.push(session)
    else groups.set(key, { label, items: [session] })
  }

  return [...groups.entries()].map(([key, { label, items }]) => ({
    key,
    label,
    ...summarize(items),
  }))
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 月別。キーは YYYY-MM で、古い順に並べる。
 * 年をまたぐと「8月」だけでは区別できないため、表示は 26/8 の形にする。
 */
export function byMonth(sessions: Session[]): Bucket[] {
  return groupBy(sessions, (s) => {
    const key = s.date.slice(0, 7)
    const [year, month] = key.split('-')
    return { key, label: `${year.slice(2)}/${Number(month)}` }
  }).sort((a, b) => a.key.localeCompare(b.key))
}

/** 機種別。収支の大きい順 */
export function byMachine(sessions: Session[], nameOf: (id: string) => string): Bucket[] {
  return groupBy(sessions, (s) => ({
    key: s.machineTypeId || '(未選択)',
    label: nameOf(s.machineTypeId),
  })).sort((a, b) => b.profit - a.profit)
}

/** 店舗別。収支の大きい順 */
export function byHall(sessions: Session[]): Bucket[] {
  return groupBy(sessions, (s) => ({
    key: s.hall || '(未入力)',
    label: s.hall || '店名未入力',
  })).sort((a, b) => b.profit - a.profit)
}

/** 曜日別。日曜から土曜の順で、打っていない曜日も欠かさず並べる */
export function byWeekday(sessions: Session[]): Bucket[] {
  const buckets = groupBy(sessions, (s) => {
    const [y, m, d] = s.date.split('-').map(Number)
    const day = new Date(y, m - 1, d).getDay()
    return { key: String(day), label: WEEKDAY_LABELS[day] }
  })

  return WEEKDAY_LABELS.map(
    (label, day) =>
      buckets.find((b) => b.key === String(day)) ?? {
        key: String(day),
        label,
        ...summarize([]),
      },
  )
}

/** 累計収支の推移。古い順に足し上げる */
export interface CumulativePoint {
  date: string
  /** その日までの累計収支 */
  total: number
  /** その日の収支 */
  daily: number
}

export function cumulativeProfit(sessions: Session[]): CumulativePoint[] {
  const byDate = new Map<string, number>()
  for (const s of sessions.filter(isCountable)) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + profit(s))
  }

  let running = 0
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, daily]) => {
      running += daily
      return { date, total: running, daily }
    })
}

export type Period = 'all' | 'thisMonth' | 'last3Months' | 'thisYear'

export const PERIOD_LABELS: Record<Period, string> = {
  all: 'すべて',
  thisMonth: '今月',
  last3Months: '直近3か月',
  thisYear: '今年',
}

/** 期間で絞り込む。日付は YYYY-MM-DD の文字列比較で判定する */
export function filterByPeriod(sessions: Session[], period: Period, now = new Date()): Session[] {
  if (period === 'all') return sessions

  const year = now.getFullYear()
  const month = now.getMonth()

  const from = (() => {
    switch (period) {
      case 'thisMonth':
        return new Date(year, month, 1)
      case 'last3Months':
        // 当月を含めて3か月ぶん
        return new Date(year, month - 2, 1)
      case 'thisYear':
        return new Date(year, 0, 1)
    }
  })()

  const pad = (n: number) => String(n).padStart(2, '0')
  const fromKey = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`
  return sessions.filter((s) => s.date >= fromKey)
}

/** 時給の集計に使えるだけの実働時間があるか。極端に短い記録は時給が跳ねる */
export function hasMeaningfulHourly(session: Session): boolean {
  return workedHours(session.startedAt, session.endedAt) >= 0.25
}

/** 最も成績の良かった台と悪かった台 */
export function extremes(sessions: Session[]): { best: Session | null; worst: Session | null } {
  const target = sessions.filter(isCountable)
  if (target.length === 0) return { best: null, worst: null }

  let best = target[0]
  let worst = target[0]
  for (const s of target) {
    if (profit(s) > profit(best)) best = s
    if (profit(s) < profit(worst)) worst = s
  }
  return { best, worst }
}
