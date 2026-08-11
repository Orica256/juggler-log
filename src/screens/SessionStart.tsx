import { useLiveQuery } from 'dexie-react-hooks'
import { CounterFields } from '../components/CounterFields'
import { Button, Card, Field, ScreenHeader, Select, TextInput } from '../components/ui'
import { MACHINES } from '../data/machines'
import { deleteSession, getSession, isBlankSession, updateSession } from '../db/sessions'
import { updateSettings } from '../db'
import { recommendedManualCount } from '../lib/discrimination'
import type { CounterSnapshot } from '../types'

/**
 * 実戦開始時の入力画面。
 * レコードは既に作成済みで、入力するたびに即座にDBへ書き込む(逐次保存)。
 */
export function SessionStart({
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

  const machine = MACHINES.find((m) => m.id === session.machineTypeId)
  const advice = machine ? recommendedManualCount(machine) : null

  const onCancel = async () => {
    await deleteSession(id)
    navigate('/', true)
  }

  /**
   * 戻るときは、何も入力されていなければレコードごと捨てる。
   * 新規実戦を開いた時点で空レコードを作る作りなので、
   * そのまま戻ると履歴に空の記録が残ってしまうため。
   */
  const onBack = async () => {
    if (isBlankSession(session)) await deleteSession(id)
    navigate('/', true)
  }

  const onStart = async () => {
    // 次回の入力を楽にするため、店名と機種を既定値として覚えておく
    await updateSettings({
      defaultHall: session.hall,
      defaultMachineTypeId: session.machineTypeId || null,
    })
    navigate(`/play/${id}`, true)
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="実戦をはじめる" onBack={onBack} />

      <Card>
        <div className="space-y-3">
          <Field label="日付">
            <input
              type="date"
              value={session.date}
              onChange={(e) => updateSession(id, { date: e.target.value })}
              className="mt-1 min-h-12 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none"
            />
          </Field>

          <Field label="店名">
            <TextInput
              value={session.hall}
              onChange={(v) => updateSession(id, { hall: v })}
              placeholder="例) 〇〇会館"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="台番号">
              <TextInput
                value={session.machineNo}
                onChange={(v) => updateSession(id, { machineNo: v })}
                placeholder="例) 123"
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
      </Card>

      {advice && (
        <Card className="mt-4">
          <h2 className="text-xs text-[var(--color-muted)]">この機種で数えるべき指標</h2>
          <p className="mt-1 text-lg font-bold text-[var(--color-accent)]">{advice.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{advice.reason}</p>
          {machine?.dataStatus === 'provisional' && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              ※ この機種の小役確率はメーカー非公表のため、複数の解析値が流通しています(暫定値)
            </p>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">着席時のデータカウンター</h2>
        <p className="mb-3 text-xs text-[var(--color-muted)]">
          前任者ぶんを含んだ数値をそのまま入力してください。自分の実績は差分で計算します。
        </p>
        <CounterFields
          value={session.start}
          onChange={(next: CounterSnapshot) => updateSession(id, { start: next })}
        />
      </Card>

      <div className="mt-6 space-y-3">
        <Button variant="primary" onClick={onStart}>
          実戦をはじめる
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          取り消す
        </Button>
      </div>
    </div>
  )
}
