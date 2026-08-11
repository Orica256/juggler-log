/**
 * データカウンター(総G数 / BB / RB / 差枚)の入力欄
 *
 * 着席時と離席時で同じ項目を入力するため共通化する。
 * 差枚はホールや機種によって表示が無いことがあるので、空欄のままにできる。
 */
import { Field, NumberInput } from './ui'
import type { CounterSnapshot } from '../types'

export function CounterFields({
  value,
  onChange,
}: {
  value: CounterSnapshot
  onChange: (next: CounterSnapshot) => void
}) {
  const set = (patch: Partial<CounterSnapshot>) => onChange({ ...value, ...patch })

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="総回転数">
        <NumberInput
          value={value.games}
          onChange={(v) => set({ games: v ?? 0 })}
          suffix="G"
          placeholder="0"
        />
      </Field>
      <Field label="差枚数(任意)">
        <NumberInput
          value={value.medals}
          onChange={(v) => set({ medals: v })}
          allowNegative
          nullable
          suffix="枚"
          placeholder="未取得"
        />
      </Field>
      <Field label="BB回数">
        <NumberInput value={value.bb} onChange={(v) => set({ bb: v ?? 0 })} placeholder="0" />
      </Field>
      <Field label="RB回数">
        <NumberInput value={value.rb} onChange={(v) => set({ rb: v ?? 0 })} placeholder="0" />
      </Field>
    </div>
  )
}
