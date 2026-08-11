import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CounterFields } from '../components/CounterFields'
import {
  Button,
  Card,
  Field,
  NumberInput,
  ScreenHeader,
  Select,
  SignedValue,
  TextArea,
  TextInput,
} from '../components/ui'
import { MACHINES, findMachine } from '../data/machines'
import { deleteSession, getSession, reopenSession, updateSession } from '../db/sessions'
import { counterDiff, hourlyRate, medalsToYen, probDenominator, profit, workedHours } from '../lib/calc'
import {
  EXCHANGE_RATE_PRESETS,
  formatDate,
  formatDuration,
  formatProb,
  formatTime,
  formatYen,
  formatYenPlain,
} from '../lib/format'

/** 記録済みセッションの詳細・編集 */
export function SessionDetail({
  id,
  navigate,
}: {
  id: string
  navigate: (to: string, replace?: boolean) => void
}) {
  const session = useLiveQuery(() => getSession(id), [id])
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!session) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const machine = findMachine(session.machineTypeId)
  const diff = counterDiff(session.start, session.end)
  const p = profit(session)
  const rate = hourlyRate(session)
  const hours = workedHours(session.startedAt, session.endedAt)

  const onDelete = async () => {
    await deleteSession(id)
    navigate('/history', true)
  }

  const onReopen = async () => {
    await reopenSession(id)
    navigate(`/play/${id}`, true)
  }

  return (
    <div className="pb-8">
      <ScreenHeader
        title={formatDate(session.date)}
        onBack={() => navigate('/history', true)}
        right={
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-sm text-[var(--color-muted)]"
          >
            {editing ? '完了' : '編集'}
          </button>
        }
      />

      <Card>
        <SignedValue value={p} text={formatYen(p)} className="text-3xl font-bold" />
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          投資 {formatYenPlain(session.invest)} / 回収{' '}
          {formatYenPlain(medalsToYen(session.payoutMedals, session.exchangeRate))}(
          {session.payoutMedals.toLocaleString('ja-JP')}枚)
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          実働 {formatDuration(hours)} / 時給 {rate === null ? '---' : formatYen(rate)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {formatTime(session.startedAt)}
          {session.endedAt ? ` 〜 ${formatTime(session.endedAt)}` : ' 〜 実戦中'}
        </p>
      </Card>

      <Card className="mt-4">
        {editing ? (
          <div className="space-y-3">
            <Field label="店名">
              <TextInput
                value={session.hall}
                onChange={(v) => updateSession(id, { hall: v })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="台番号">
                <TextInput
                  value={session.machineNo}
                  onChange={(v) => updateSession(id, { machineNo: v })}
                />
              </Field>
              <Field label="機種">
                <Select
                  value={session.machineTypeId}
                  onChange={(v) => updateSession(id, { machineTypeId: v })}
                  options={MACHINES.map((m) => ({ value: m.id, label: m.name }))}
                  placeholder="選択してください"
                />
              </Field>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm">
              {machine?.name ?? '機種未選択'}
              <span className="ml-2 text-xs text-[var(--color-muted)]">{session.machineNo}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{session.hall || '店名未入力'}</p>
          </>
        )}
      </Card>

      {machine && session.myCount.games > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/estimate/${id}`)}
          className="mt-4 block w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left active:brightness-125"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">設定推測</span>
            <span className="text-xs text-[var(--color-muted)]">見る ›</span>
          </div>
        </button>
      )}

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">自分の実績</h2>
        {diff ? (
          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm tabular-nums">
            <div>
              <p className="text-xs text-[var(--color-muted)]">G数</p>
              <p>{diff.games.toLocaleString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">BB</p>
              <p>{diff.bb}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">RB</p>
              <p>{diff.rb}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)]">合算</p>
              <p>{formatProb(probDenominator(diff.games, diff.bb + diff.rb), 1)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--color-muted)]">離席時のカウンターが未入力です</p>
        )}
      </Card>

      {editing && (
        <>
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">着席時のカウンター</h2>
            <CounterFields
              value={session.start}
              onChange={(next) => updateSession(id, { start: next })}
            />
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">離席時のカウンター</h2>
            <CounterFields
              value={session.end ?? { ...session.start }}
              onChange={(next) => updateSession(id, { end: next })}
            />
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold">収支</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="投資">
                <NumberInput
                  value={session.invest}
                  onChange={(v) => updateSession(id, { invest: v ?? 0 })}
                  suffix="円"
                />
              </Field>
              <Field label="回収枚数">
                <NumberInput
                  value={session.payoutMedals}
                  onChange={(v) => updateSession(id, { payoutMedals: v ?? 0 })}
                  suffix="枚"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="交換率">
                <Select
                  value={String(session.exchangeRate)}
                  onChange={(v) => updateSession(id, { exchangeRate: Number(v) })}
                  options={EXCHANGE_RATE_PRESETS.map((pr) => ({
                    value: String(pr.value),
                    label: pr.label,
                  }))}
                />
              </Field>
            </div>
          </Card>
        </>
      )}

      <Card className="mt-4">
        <Field label="メモ">
          <TextArea
            value={session.memo}
            onChange={(v) => updateSession(id, { memo: v })}
            rows={3}
            placeholder="所感など"
          />
        </Field>
      </Card>

      <div className="mt-6 space-y-3">
        {session.status === 'finished' && (
          <Button variant="secondary" onClick={onReopen}>
            実戦中に戻す
          </Button>
        )}
        {confirmingDelete ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-[var(--color-minus)]">
              この記録を削除します。元に戻せません。
            </p>
            <Button variant="danger" onClick={onDelete}>
              削除する
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              やめる
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
            この記録を削除
          </Button>
        )}
      </div>
    </div>
  )
}
