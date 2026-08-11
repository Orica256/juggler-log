import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BucketList, CumulativeLine, DivergingBars } from '../components/charts'
import { Card, EmptyState, ScreenHeader, SignedValue } from '../components/ui'
import { findMachine } from '../data/machines'
import { listSessions } from '../db/sessions'
import { formatDate, formatDuration, formatYen, formatYenPlain } from '../lib/format'
import {
  byHall,
  byMachine,
  byMonth,
  byWeekday,
  cumulativeProfit,
  extremes,
  filterByPeriod,
  PERIOD_LABELS,
  summarize,
  type Period,
} from '../lib/stats'
import { profit } from '../lib/calc'
import type { Session } from '../types'

const PERIODS: Period[] = ['thisMonth', 'last3Months', 'thisYear', 'all']

/** 数字を1つ大きく見せる枠 */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  )
}

/** 最高・最低の台への近道 */
function Extreme({
  label,
  session,
  navigate,
}: {
  label: string
  session: Session
  navigate: (to: string) => void
}) {
  const p = profit(session)
  return (
    <button
      type="button"
      onClick={() => navigate(`/session/${session.id}`)}
      className="w-full rounded-lg border border-[var(--color-line)] p-3 text-left active:brightness-125"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-[var(--color-muted)]">{label}</span>
        <SignedValue value={p} text={formatYen(p)} className="text-sm font-bold" />
      </div>
      <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">
        {formatDate(session.date)} ・ {findMachine(session.machineTypeId)?.name ?? '機種未選択'} ・{' '}
        {session.hall || '店名未入力'}
      </p>
    </button>
  )
}

export function Stats({ navigate }: { navigate: (to: string, replace?: boolean) => void }) {
  const [period, setPeriod] = useState<Period>('all')
  const sessions = useLiveQuery(() => listSessions(), [])

  if (!sessions) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const target = filterByPeriod(sessions, period)
  const summary = summarize(target)
  const months = byMonth(target)
  const cumulative = cumulativeProfit(target)
  const { best, worst } = extremes(target)

  return (
    <div className="pb-12">
      <ScreenHeader title="統計" onBack={() => navigate('/', true)} />

      {/* 期間の切り替えはグラフの上に1行で置く */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
              period === p
                ? 'bg-[var(--color-accent)] font-semibold text-black'
                : 'border border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {summary.count === 0 ? (
        <EmptyState>この期間の記録がありません</EmptyState>
      ) : (
        <>
          <Card>
            <p className="text-xs text-[var(--color-muted)]">収支</p>
            <SignedValue
              value={summary.profit}
              text={formatYen(summary.profit)}
              className="block text-3xl font-bold"
            />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat
                label="勝率"
                value={summary.winRate === null ? '--' : `${Math.round(summary.winRate * 100)}%`}
                sub={`${summary.wins}勝${summary.count - summary.wins}敗`}
              />
              <Stat
                label="時給"
                value={summary.hourly === null ? '--' : formatYen(summary.hourly)}
                sub={`実働 ${formatDuration(summary.hours)}`}
              />
              <Stat
                label="回転数"
                value={summary.games.toLocaleString('ja-JP')}
                sub={`${summary.count}台`}
              />
            </div>
            <div className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
              投資 {formatYenPlain(summary.invest)} / 回収 {formatYenPlain(summary.payout)}
            </div>
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">累計収支の推移</h2>
            <CumulativeLine points={cumulative} />
          </Card>

          {months.length > 1 && (
            <Card className="mt-4">
              <h2 className="mb-3 text-sm font-semibold">月別の収支</h2>
              <DivergingBars buckets={months} />
            </Card>
          )}

          {(best || worst) && (
            <Card className="mt-4">
              <h2 className="mb-3 text-sm font-semibold">いちばん動いた台</h2>
              <div className="space-y-2">
                {best && <Extreme label="最高" session={best} navigate={navigate} />}
                {worst && worst.id !== best?.id && (
                  <Extreme label="最低" session={worst} navigate={navigate} />
                )}
              </div>
            </Card>
          )}

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">機種別</h2>
            <BucketList buckets={byMachine(target, (id) => findMachine(id)?.name ?? '機種未選択')} />
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">店舗別</h2>
            <BucketList buckets={byHall(target)} />
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">曜日別</h2>
            <BucketList buckets={byWeekday(target)} emptyLabel="まだ集計できる記録がありません" />
          </Card>

          <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
            実戦中の記録は収支が確定していないため、集計に含めていません。
          </p>
        </>
      )}
    </div>
  )
}
