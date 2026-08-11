import { describe, expect, it } from 'vitest'
import {
  byHall,
  byMachine,
  byMonth,
  byWeekday,
  cumulativeProfit,
  extremes,
  filterByPeriod,
  summarize,
} from './stats'
import type { Session } from '../types'

let seq = 0

/** 収支が profit 円になるセッションを作る(等価なので枚数×20円) */
function session(patch: Partial<Session> & { profit?: number } = {}): Session {
  const { profit: wanted = 0, ...rest } = patch
  const invest = rest.invest ?? 20000
  seq += 1
  return {
    id: `s${seq}`,
    date: '2026-08-11',
    hall: '〇〇会館',
    machineNo: '1',
    machineTypeId: 'my-juggler-v',
    start: { games: 0, bb: 0, rb: 0, medals: null },
    end: { games: 3000, bb: 12, rb: 8, medals: null },
    myCount: { games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 5, cherryRb: 3 },
    invest,
    payoutMedals: (invest + wanted) / 20,
    exchangeRate: 20,
    startedAt: '2026-08-11T01:00:00.000Z',
    endedAt: '2026-08-11T05:00:00.000Z',
    memo: '',
    status: 'finished',
    ...rest,
  }
}

describe('summarize', () => {
  it('収支・投資・回収を合計する', () => {
    const result = summarize([session({ profit: 10000 }), session({ profit: -4000 })])
    expect(result.count).toBe(2)
    expect(result.profit).toBe(6000)
    expect(result.invest).toBe(40000)
    expect(result.payout).toBe(46000)
  })

  it('勝率は収支がプラスの台の割合', () => {
    const result = summarize([
      session({ profit: 10000 }),
      session({ profit: -4000 }),
      session({ profit: -1000 }),
    ])
    expect(result.wins).toBe(1)
    expect(result.winRate).toBeCloseTo(1 / 3)
  })

  it('収支が±0の台は勝ちに数えない', () => {
    expect(summarize([session({ profit: 0 })]).wins).toBe(0)
  })

  it('実働時間と平均時給を出す', () => {
    // 4時間で +10,000円 と 4時間で -4,000円 → 8時間で +6,000円
    const result = summarize([session({ profit: 10000 }), session({ profit: -4000 })])
    expect(result.hours).toBeCloseTo(8)
    expect(result.hourly).toBe(750)
  })

  it('実戦中の記録は集計から除く(収支が確定していないため)', () => {
    const result = summarize([
      session({ profit: 10000 }),
      session({ profit: 999999, status: 'active' }),
    ])
    expect(result.count).toBe(1)
    expect(result.profit).toBe(10000)
  })

  it('記録が無ければ勝率も時給も null にする(0と区別する)', () => {
    const result = summarize([])
    expect(result.count).toBe(0)
    expect(result.winRate).toBeNull()
    expect(result.hourly).toBeNull()
  })
})

describe('集計の切り口', () => {
  it('月別は古い順に並び、年をまたいでも区別できる', () => {
    const buckets = byMonth([
      session({ date: '2026-08-02', profit: 3000 }),
      session({ date: '2025-12-31', profit: 1000 }),
      session({ date: '2026-08-20', profit: 2000 }),
    ])
    expect(buckets.map((b) => b.label)).toEqual(['25/12', '26/8'])
    expect(buckets[1].profit).toBe(5000)
  })

  it('機種別は収支の大きい順', () => {
    const buckets = byMachine(
      [
        session({ machineTypeId: 'my-juggler-v', profit: -5000 }),
        session({ machineTypeId: 'gogo-juggler-3', profit: 8000 }),
      ],
      (id) => (id === 'my-juggler-v' ? 'マイジャグラーV' : 'ゴーゴージャグラー3'),
    )
    expect(buckets.map((b) => b.label)).toEqual(['ゴーゴージャグラー3', 'マイジャグラーV'])
  })

  it('店名が空の記録もまとめて数える', () => {
    const buckets = byHall([session({ hall: '', profit: 1000 }), session({ hall: '', profit: 2000 })])
    expect(buckets).toHaveLength(1)
    expect(buckets[0].label).toBe('店名未入力')
    expect(buckets[0].profit).toBe(3000)
  })

  it('曜日別は打っていない曜日も日〜土の順で並べる', () => {
    // 2026-08-11 は火曜日
    const buckets = byWeekday([session({ date: '2026-08-11', profit: 5000 })])
    expect(buckets.map((b) => b.label)).toEqual(['日', '月', '火', '水', '木', '金', '土'])
    expect(buckets[2].profit).toBe(5000)
    expect(buckets[0].count).toBe(0)
  })
})

describe('累計収支の推移', () => {
  it('同じ日の記録はまとめ、古い順に足し上げる', () => {
    const points = cumulativeProfit([
      session({ date: '2026-08-11', profit: 3000 }),
      session({ date: '2026-08-09', profit: -5000 }),
      session({ date: '2026-08-11', profit: 2000 }),
    ])

    expect(points).toEqual([
      { date: '2026-08-09', daily: -5000, total: -5000 },
      { date: '2026-08-11', daily: 5000, total: 0 },
    ])
  })

  it('記録が無ければ空になる', () => {
    expect(cumulativeProfit([])).toEqual([])
  })
})

describe('期間の絞り込み', () => {
  const now = new Date(2026, 7, 11) // 2026-08-11
  const sessions = [
    session({ date: '2026-08-05' }),
    session({ date: '2026-07-20' }),
    session({ date: '2026-06-01' }),
    session({ date: '2026-05-31' }),
    session({ date: '2025-12-30' }),
  ]

  it('今月', () => {
    expect(filterByPeriod(sessions, 'thisMonth', now).map((s) => s.date)).toEqual(['2026-08-05'])
  })

  it('直近3か月は当月を含めて3か月ぶん', () => {
    expect(filterByPeriod(sessions, 'last3Months', now).map((s) => s.date)).toEqual([
      '2026-08-05',
      '2026-07-20',
      '2026-06-01',
    ])
  })

  it('今年', () => {
    expect(filterByPeriod(sessions, 'thisYear', now)).toHaveLength(4)
  })

  it('すべて', () => {
    expect(filterByPeriod(sessions, 'all', now)).toHaveLength(5)
  })
})

describe('最高と最低', () => {
  it('収支が最大・最小の台を返す', () => {
    const best = session({ profit: 30000 })
    const worst = session({ profit: -20000 })
    const result = extremes([session({ profit: 1000 }), best, worst])

    expect(result.best?.id).toBe(best.id)
    expect(result.worst?.id).toBe(worst.id)
  })

  it('記録が無ければ null', () => {
    expect(extremes([])).toEqual({ best: null, worst: null })
  })
})
