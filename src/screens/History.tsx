import { useLiveQuery } from 'dexie-react-hooks'
import { Card, EmptyState, ScreenHeader, SignedValue } from '../components/ui'
import { findMachine } from '../data/machines'
import { listSessions } from '../db/sessions'
import { hourlyRate, profit } from '../lib/calc'
import { formatDate, formatYen } from '../lib/format'
import type { Session } from '../types'

/** 日付ごとにまとめる(新しい順) */
function groupByDate(sessions: Session[]): [string, Session[]][] {
  const map = new Map<string, Session[]>()
  for (const s of sessions) {
    const list = map.get(s.date)
    if (list) list.push(s)
    else map.set(s.date, [s])
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

export function History({ navigate }: { navigate: (to: string, replace?: boolean) => void }) {
  const sessions = useLiveQuery(() => listSessions(), [])

  if (!sessions) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const finished = sessions.filter((s) => s.status === 'finished')
  const total = finished.reduce((sum, s) => sum + profit(s), 0)
  const wins = finished.filter((s) => profit(s) > 0).length
  const groups = groupByDate(sessions)

  return (
    <div className="pb-8">
      <ScreenHeader
        title="履歴"
        onBack={() => navigate('/', true)}
        right={
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="shrink-0 text-sm text-[var(--color-muted)]"
          >
            統計
          </button>
        }
      />

      <Card>
        <h2 className="text-xs text-[var(--color-muted)]">累計収支({finished.length}台)</h2>
        <SignedValue value={total} text={formatYen(total)} className="text-3xl font-bold" />
        {finished.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            勝率 {Math.round((wins / finished.length) * 100)}%({wins}勝
            {finished.length - wins}敗)
          </p>
        )}
      </Card>

      {groups.length === 0 ? (
        <EmptyState>まだ記録がありません</EmptyState>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map(([date, items]) => {
            const dayProfit = items
              .filter((s) => s.status === 'finished')
              .reduce((sum, s) => sum + profit(s), 0)
            return (
              <section key={date}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">{formatDate(date)}</h2>
                  <SignedValue value={dayProfit} text={formatYen(dayProfit)} className="text-sm" />
                </div>
                <ul className="space-y-2">
                  {items.map((s) => {
                    const p = profit(s)
                    const rate = hourlyRate(s)
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/session/${s.id}`)}
                          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-left active:brightness-125"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm">
                              {findMachine(s.machineTypeId)?.name ?? '機種未選択'}
                              <span className="ml-2 text-xs text-[var(--color-muted)]">
                                {s.machineNo}
                              </span>
                            </span>
                            {s.status === 'active' ? (
                              <span className="shrink-0 text-xs text-[var(--color-plus)]">
                                実戦中
                              </span>
                            ) : (
                              <SignedValue
                                value={p}
                                text={formatYen(p)}
                                className="shrink-0 font-bold"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            {s.hall || '店名未入力'}
                            {s.status === 'finished' &&
                              ` ・ 時給${rate === null ? '---' : formatYen(rate)}`}
                          </p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
