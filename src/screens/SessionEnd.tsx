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
} from '../components/ui'
import { findMachine } from '../data/machines'
import { finishSession, getSession, updateSession } from '../db/sessions'
import { counterDiff, medalsToYen, profit } from '../lib/calc'
import { EXCHANGE_RATE_PRESETS, formatProb, formatYen, formatYenPlain } from '../lib/format'
import { probDenominator } from '../lib/calc'
import type { CounterSnapshot } from '../types'

/** 実戦終了時の入力画面。終了時カウンターと回収枚数を入れて収支を確定する */
export function SessionEnd({
  id,
  navigate,
}: {
  id: string
  navigate: (to: string, replace?: boolean) => void
}) {
  const session = useLiveQuery(() => getSession(id), [id])

  if (!session) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const machine = findMachine(session.machineTypeId)
  // 終了時カウンターが未入力なら、着席時の値を初期値として編集させる
  const end: CounterSnapshot = session.end ?? { ...session.start }
  const diff = counterDiff(session.start, session.end)
  const payoutYen = medalsToYen(session.payoutMedals, session.exchangeRate)
  const currentProfit = profit(session)

  const onFinish = async () => {
    await finishSession(id)
    navigate(`/session/${id}`, true)
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="実戦を終了する" onBack={() => navigate(`/play/${id}`, true)} />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">離席時のデータカウンター</h2>
        <CounterFields value={end} onChange={(next) => updateSession(id, { end: next })} />

        {diff && (
          <div className="mt-3 rounded-lg bg-[var(--color-bg)] p-3">
            <p className="text-xs text-[var(--color-muted)]">自分の実績(差分)</p>
            <div className="mt-1 grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
              <div>
                <p className="text-xs text-[var(--color-muted)]">G数</p>
                <p>{diff.games.toLocaleString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">BB / RB</p>
                <p>
                  {diff.bb} / {diff.rb}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-muted)]">合算</p>
                <p>{formatProb(probDenominator(diff.games, diff.bb + diff.rb), 1)}</p>
              </div>
            </div>
            {(diff.games < 0 || diff.bb < 0 || diff.rb < 0) && (
              <p className="mt-2 text-xs text-[var(--color-minus)]">
                差分がマイナスです。着席時と離席時の値が入れ替わっていないか確認してください。
              </p>
            )}
          </div>
        )}
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
          <Field label="交換率" hint={`回収 ${formatYenPlain(payoutYen)}`}>
            <Select
              value={String(session.exchangeRate)}
              onChange={(v) => updateSession(id, { exchangeRate: Number(v) })}
              options={EXCHANGE_RATE_PRESETS.map((p) => ({
                value: String(p.value),
                label: p.label,
              }))}
            />
          </Field>
        </div>

        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <p className="text-xs text-[var(--color-muted)]">収支</p>
          <SignedValue
            value={currentProfit}
            text={formatYen(currentProfit)}
            className="text-3xl font-bold"
          />
        </div>
      </Card>

      <Card className="mt-4">
        <Field label="メモ(任意)">
          <TextArea
            value={session.memo}
            onChange={(v) => updateSession(id, { memo: v })}
            rows={2}
            placeholder={machine ? `${machine.name} の所感など` : '所感など'}
          />
        </Field>
      </Card>

      <div className="mt-6">
        <Button variant="primary" onClick={onFinish}>
          記録を確定する
        </Button>
      </div>
    </div>
  )
}
