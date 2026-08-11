import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Card, EmptyState, SignedValue } from '../components/ui'
import { db } from '../db'
import { getActiveSession, startSession } from '../db/sessions'
import { hourlyRate, profit, workedHours } from '../lib/calc'
import { formatDuration, formatYen, today } from '../lib/format'
import { findMachine } from '../data/machines'

export function Home({ navigate }: { navigate: (to: string) => void }) {
  const active = useLiveQuery(() => getActiveSession(), [])
  const todaySessions = useLiveQuery(
    () => db.sessions.where('date').equals(today()).toArray(),
    [],
  )

  const finishedToday = (todaySessions ?? []).filter((s) => s.status === 'finished')
  const todayProfit = finishedToday.reduce((sum, s) => sum + profit(s), 0)

  const onStart = async () => {
    const session = await startSession()
    navigate(`/start/${session.id}`)
  }

  return (
    <div className="pb-8">
      <header className="safe-top mb-4 flex items-baseline justify-between pb-3">
        <h1 className="text-lg font-bold">ジャグラー実戦記録</h1>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => navigate('/stats')}
            className="text-sm text-[var(--color-muted)]"
          >
            統計
          </button>
          <button
            type="button"
            onClick={() => navigate('/help')}
            className="text-sm text-[var(--color-muted)]"
          >
            使い方
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-sm text-[var(--color-muted)]"
          >
            設定
          </button>
        </div>
      </header>

      <Card>
        <h2 className="text-xs text-[var(--color-muted)]">今日の収支</h2>
        {finishedToday.length === 0 ? (
          <p className="mt-2 text-2xl font-bold text-[var(--color-muted)]">記録なし</p>
        ) : (
          <>
            <SignedValue
              value={todayProfit}
              text={formatYen(todayProfit)}
              className="mt-1 block text-3xl font-bold"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {finishedToday.length}台 / 実働
              {formatDuration(
                finishedToday.reduce((h, s) => h + workedHours(s.startedAt, s.endedAt), 0),
              )}
            </p>
          </>
        )}
      </Card>

      {active ? (
        <Card className="mt-4 border-[var(--color-plus)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--color-plus)]" />
            <h2 className="text-sm font-semibold">実戦中</h2>
          </div>
          <p className="mt-2 text-sm">
            {active.hall || '店名未入力'} / {active.machineNo || '台番号未入力'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {findMachine(active.machineTypeId)?.name ?? '機種未選択'} ・ 投資
            {active.invest.toLocaleString('ja-JP')}円 ・ 経過
            {formatDuration(workedHours(active.startedAt, null))}
          </p>
          <div className="mt-3">
            <Button variant="primary" onClick={() => navigate(`/play/${active.id}`)}>
              実戦に戻る
            </Button>
          </div>
        </Card>
      ) : (
        <div className="mt-4">
          <Button variant="primary" onClick={onStart}>
            ＋ 新規実戦をはじめる
          </Button>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">今日の実戦</h2>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="text-sm text-[var(--color-muted)]"
          >
            すべての履歴 ›
          </button>
        </div>

        {finishedToday.length === 0 ? (
          <EmptyState>まだ記録がありません</EmptyState>
        ) : (
          <ul className="space-y-2">
            {finishedToday.map((s) => {
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
                      <SignedValue value={p} text={formatYen(p)} className="shrink-0 font-bold" />
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                      {s.hall} ・ 時給{rate === null ? '---' : formatYen(rate)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
