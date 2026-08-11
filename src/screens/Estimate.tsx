import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, ScreenHeader } from '../components/ui'
import { findMachine } from '../data/machines'
import { getSettings } from '../db'
import { getSession } from '../db/sessions'
import { checkGrapeSensitivity, estimateSetting, type Estimation } from '../lib/bayes'
import type { AppSettings, MachineSpec, MyCount } from '../types'

/** 事後確率を横棒で並べる。最有力の設定だけ色を付け、ほかは地の色に沈める */
function PosteriorBars({ estimation }: { estimation: Estimation }) {
  const max = Math.max(...estimation.posterior.map((p) => p.probability))

  return (
    <ul className="space-y-2">
      {estimation.posterior.map((p) => {
        const isTop = p.probability === max
        return (
          <li key={p.setting} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-xs text-[var(--color-muted)]">
              設定{p.setting}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-line)]">
              <span
                className={`block h-full rounded-[4px] ${
                  isTop ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted)]'
                }`}
                style={{ width: `${Math.max(p.probability * 100, 1)}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-sm tabular-nums">
              {(p.probability * 100).toFixed(1)}
              <span className="text-xs text-[var(--color-muted)]">%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** 指標ごとに「その指標だけで見るとどのあたりか」を示す */
function Contributions({ estimation }: { estimation: Estimation }) {
  return (
    <ul className="space-y-3">
      {estimation.contributions.map((c) => (
        <li key={c.key}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm">{c.label}</span>
            {c.usable ? (
              <span className="text-sm tabular-nums">
                設定 {c.expectedSetting!.toFixed(1)} 相当
              </span>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">使えません</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {c.usable && c.observed
              ? `${c.observed.count.toLocaleString('ja-JP')} / ${c.observed.trials.toLocaleString('ja-JP')}`
              : c.reason}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function EstimateView({
  machine,
  count,
  settings,
}: {
  machine: MachineSpec
  count: MyCount
  settings: AppSettings
}) {
  const estimation = estimateSetting(machine, count)
  const sensitivity = checkGrapeSensitivity(machine, count)
  const lowPercent = estimation.lowProbability * 100

  return (
    <>
      <Card>
        <p className="text-xs text-[var(--color-muted)]">期待設定</p>
        <p className="text-4xl font-bold tabular-nums">
          {estimation.expectedSetting.toFixed(1)}
        </p>
        <div className="mt-2 flex gap-4 text-xs text-[var(--color-muted)]">
          <span>設定1・2 {lowPercent.toFixed(0)}%</span>
          <span>設定5・6 {(estimation.highProbability * 100).toFixed(0)}%</span>
        </div>

        {estimation.weak && (
          <p className="mt-3 rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--color-muted)]">
            まだ判断材料が乏しく、打つ前の想定からほとんど動いていません。
            この数字で設定を判断しないでください。
          </p>
        )}
      </Card>

      {!estimation.weak && lowPercent >= settings.lowSettingAlertThreshold && (
        <Card className="mt-4 border-[var(--color-minus)]">
          <h2 className="text-sm font-semibold text-[var(--color-minus)]">やめ時の目安です</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
            設定1・2である確率が {lowPercent.toFixed(0)}% に達しています
            (通知の基準は {settings.lowSettingAlertThreshold}%)。
            続けるかどうか考えてもよい頃合いです。
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">設定ごとの確からしさ</h2>
        <PosteriorBars estimation={estimation} />
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">何がそう言っているのか</h2>
        <Contributions estimation={estimation} />
        <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
          それぞれの指標だけで判断した場合にどのあたりになるかです。
          上の結果は、これらをまとめて計算したものです。
        </p>
      </Card>

      {sensitivity.available && (
        <Card className="mt-4">
          <h2 className="text-sm font-semibold">ぶどう解析値の食い違いについて</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
            この機種はぶどうの理論値が複数流通しています。もう一方の解析値で計算すると
            期待設定は {sensitivity.altExpectedSetting?.toFixed(1)} になります。
          </p>
          {sensitivity.flipped ? (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-minus)]">
              どちらの解析値を採用するかで結論が変わります。この判定は当てにしないでください。
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              どちらを採用しても結論は変わりません。
            </p>
          )}
        </Card>
      )}

      <p className="mt-4 text-xs leading-relaxed text-[var(--color-muted)]">
        すべての設定が同じ割合で使われている前提で計算しています。
        高設定が入りにくい店では、実際にはこれより低く見積もるべきです。
      </p>
    </>
  )
}

/** 設定推測の画面 */
export function Estimate({
  id,
  navigate,
}: {
  id: string
  navigate: (to: string, replace?: boolean) => void
}) {
  const session = useLiveQuery(() => getSession(id), [id])
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!session || !settings) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const machine = findMachine(session.machineTypeId)
  const back = session.status === 'active' ? `/play/${id}` : `/session/${id}`

  return (
    <div className="pb-12">
      <ScreenHeader title="設定推測" onBack={() => navigate(back, true)} />

      {machine ? (
        <EstimateView machine={machine} count={session.myCount} settings={settings} />
      ) : (
        <Card>
          <p className="text-xs text-[var(--color-muted)]">
            機種が選ばれていないため推測できません。「開始情報」から機種を選んでください。
          </p>
        </Card>
      )}
    </div>
  )
}
