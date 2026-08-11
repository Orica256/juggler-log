/**
 * 実戦中のリアルタイム確率表示
 *
 * 指標を色で区別する案は破棄した。4色の識別色はどの組み合わせでも
 * 赤緑色覚でどれかの組が判別不能になるうえ、各行にはラベルがあるので
 * 色に識別を担わせる必要がない(index.css のコメント参照)。
 * 色はメーターの現在位置にだけ使い、値やラベルは文字トークンのままにする。
 */
import { myProbabilities, normalGames, probDenominator, settingPosition } from '../lib/calc'
import { formatProb } from '../lib/format'
import { gamesToSeparateExtremes, grapeGroups, recommendedManualCount } from '../lib/discrimination'
import { classifiedRb, type MachineSpec, type MyCount, type SettingSpec } from '../types'

/** 判別の確からしさの段階 */
type Confidence = 'reference' | 'rough' | 'enough'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  reference: '参考値',
  rough: '目安',
  enough: '十分',
}

interface Row {
  key: string
  label: string
  /** 観測した確率の分母。算出できない場合は null */
  observed: number | null
  /** 観測はしているが0回だった場合の補足(例: 単独REG 0回) */
  zeroNote: string | null
  setting1: number
  setting6: number
  recommended: boolean
  /** 設定1〜6で理論値が単調に変化するか。同値の設定があるとメーターが嘘になる */
  monotonic: boolean
  /** 同値の設定グループ(区別できない範囲)の説明 */
  tieNote: string | null
  confidence: Confidence
}

function pickSetting(machine: MachineSpec, setting: number): SettingSpec | undefined {
  // 配列の並び順に依存しない。ユーザー編集を許す設計のため添字前提にはしない
  return machine.settings.find((s) => s.setting === setting)
}

function confidenceOf(games: number, gamesToDistinguish: number | null): Confidence {
  if (gamesToDistinguish === null || gamesToDistinguish <= 0) return 'reference'
  const ratio = games / gamesToDistinguish
  if (ratio >= 1) return 'enough'
  if (ratio >= 0.25) return 'rough'
  return 'reference'
}

function buildRows(machine: MachineSpec, count: MyCount): Row[] {
  const probs = myProbabilities(count)
  const advice = recommendedManualCount(machine)
  const classified = classifiedRb(count)
  // ぶどうは通常時にしか数えないので、分母もボーナス消化ぶんを除いたG数を使う
  const normal = normalGames(count, machine)

  const defs: {
    key: string
    label: string
    observed: number | null
    pick: (s: SettingSpec) => number | null
    recommended: boolean
    zeroNote: string | null
    /** その指標の分母に使うG数。ぶどうだけ通常時G数になる */
    basisGames: number
  }[] = [
    { key: 'total', label: '合算', observed: probs.total, pick: (s) => s.totalProb, recommended: false, zeroNote: null, basisGames: count.games },
    { key: 'bb', label: 'BB', observed: probs.bb, pick: (s) => s.bbProb, recommended: false, zeroNote: null, basisGames: count.games },
    { key: 'rb', label: 'REG', observed: probs.rb, pick: (s) => s.rbProb, recommended: false, zeroNote: null, basisGames: count.games },
    {
      key: 'grape',
      label: 'ぶどう',
      observed: probDenominator(normal.games, count.grape),
      pick: (s) => s.grapeProb,
      recommended: advice.key === 'grape',
      zeroNote: null,
      basisGames: normal.games,
    },
    {
      key: 'soloRb',
      label: '単独REG',
      observed: probs.soloRb,
      pick: (s) => s.soloRbProb,
      recommended: advice.key === 'soloRb',
      // 「まだ分類していない」と「分類した結果0回だった」は意味がまったく違う
      zeroNote:
        count.soloRb === 0
          ? classified === 0
            ? '未計測'
            : `0回(分類済みREG ${classified}回中)`
          : null,
      basisGames: count.games,
    },
  ]

  const s1 = pickSetting(machine, 1)
  const s6 = pickSetting(machine, 6)
  if (!s1 || !s6) return []

  return defs.flatMap((def) => {
    const low = def.pick(s1)
    const high = def.pick(s6)
    // 理論値が無い指標(単独REGの解析値が無い機種)は表示しない
    if (low === null || high === null) return []

    const values = machine.settings
      .slice()
      .sort((a, b) => a.setting - b.setting)
      .map(def.pick)
    const monotonic = values.every(
      (v, i) => i === 0 || (v !== null && values[i - 1] !== null && v < values[i - 1]!),
    )

    let tieNote: string | null = null
    if (!monotonic && def.key === 'grape') {
      const ties = grapeGroups(machine)
        .filter((g) => g.length > 1)
        .map((g) => `設定${g.join('・')}`)
        .join(' / ')
      tieNote = ties ? `${ties} は同値のため区別できない` : null
    } else if (!monotonic) {
      tieNote = '同じ値の設定があるため位置では判断できない'
    }

    const gamesToDistinguish = gamesToSeparateExtremes(machine, def.pick)

    return [
      {
        key: def.key,
        label: def.label,
        observed: def.observed,
        zeroNote: def.zeroNote,
        setting1: low,
        setting6: high,
        recommended: def.recommended,
        monotonic,
        tieNote,
        confidence: confidenceOf(def.basisGames, gamesToDistinguish),
      },
    ]
  })
}

/**
 * 設定1〜6のどのあたりかを示すメーター。
 * 理論値の範囲外に振れている場合は中空の点にして、
 * 「端に張り付いている」だけであることを示す。
 */
function Meter({
  position,
  clamped,
  dimmed,
}: {
  position: number | null
  clamped: boolean
  dimmed: boolean
}) {
  return (
    <div className="relative h-1 w-full rounded-full bg-[var(--color-line)]">
      {position !== null && (
        <span
          aria-hidden
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--color-surface)] ${
            clamped
              ? 'border-2 border-[var(--color-muted)] bg-transparent'
              : dimmed
                ? 'bg-[var(--color-muted)]'
                : 'bg-[var(--color-accent)]'
          }`}
          style={{ left: `${position * 100}%` }}
        />
      )}
    </div>
  )
}

export function RealtimeStats({ machine, count }: { machine: MachineSpec; count: MyCount }) {
  const rows = buildRows(machine, count)
  const normal = normalGames(count, machine)

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">現在の確率</h2>
        <span className="text-[10px] text-[var(--color-muted)]">
          {normal.corrected
            ? `ぶどうの分母: 通常時 ${normal.games.toLocaleString('ja-JP')}G`
            : 'ぶどうの分母: 総G数(未補正)'}
        </span>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const position = row.monotonic
            ? settingPosition(row.observed, row.setting1, row.setting6)
            : null
          const clamped =
            row.observed !== null && (row.observed > row.setting1 || row.observed < row.setting6)

          return (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">
                  {row.label}
                  {row.recommended && (
                    <span className="ml-1.5 rounded bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]">
                      数える
                    </span>
                  )}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[10px] text-[var(--color-muted)]">
                    {CONFIDENCE_LABEL[row.confidence]}
                  </span>
                  <span className="tabular-nums text-sm">
                    {row.zeroNote ?? formatProb(row.observed)}
                  </span>
                </span>
              </div>

              {row.monotonic ? (
                <>
                  <div className="mt-1.5">
                    <Meter
                      position={position}
                      clamped={clamped}
                      dimmed={row.confidence === 'reference'}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted)]">
                    <span>設定1 {formatProb(row.setting1, 1)}</span>
                    <span>設定6 {formatProb(row.setting6, 1)}</span>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">
                  {row.tieNote}(設定1 {formatProb(row.setting1, 1)} / 設定6{' '}
                  {formatProb(row.setting6, 1)})
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {!normal.corrected && (
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-minus)]">
          ぶどうは通常時のみ数えるため、本来は分母からボーナス消化ぶんを除く必要があります。
          この機種は平均消化ゲーム数の裏が取れていないため未補正で、ぶどう確率は実際より
          1割ほど悪く出ます。
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-muted)]">
        「参考値 / 目安 / 十分」は、設定1と設定6を見分けるのに必要なG数に対する現在の消化G数の割合です。
        1台ぶんの実戦で「十分」に届く指標はほとんどありません。
        {machine.dataStatus === 'provisional' &&
          ' なお、ぶどう・単独REGの理論値はメーカー非公表の解析値で、この機種は複数の系統が流通しています(暫定値)。'}
      </p>
    </div>
  )
}
