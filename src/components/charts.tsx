/**
 * 統計画面のグラフ
 *
 * グラフ用のライブラリは入れていない。ここで必要なのは棒と折れ線だけで、
 * 配色をテーマのトークンに合わせたいこと、スマホで文字を潰したくないことから、
 * 形は最小限のSVG、目盛りや値はHTMLで描く。
 *
 * 色は収支の符号(プラス/マイナス)にだけ使う。系列を色で区別する必要が無いので、
 * それ以外は文字トークンと地の色で構成する。
 */
import { formatYen } from '../lib/format'
import type { Bucket, CumulativePoint } from '../lib/stats'

/** 0を挟んで上下に伸びる棒グラフ。月別の収支に使う */
export function DivergingBars({ buckets }: { buckets: Bucket[] }) {
  const maxAbs = Math.max(...buckets.map((b) => Math.abs(b.profit)), 1)

  return (
    <div>
      <div className="flex h-40 items-stretch gap-1">
        {buckets.map((b) => {
          const ratio = Math.abs(b.profit) / maxAbs
          const positive = b.profit >= 0
          return (
            <div key={b.key} className="flex min-w-0 flex-1 flex-col">
              {/* 上半分がプラス、下半分がマイナス。中央が0の基準線 */}
              <div className="flex flex-1 items-end">
                {positive && (
                  <span
                    className="w-full rounded-t-[4px] bg-[var(--color-plus)]"
                    style={{ height: `${ratio * 100}%` }}
                  />
                )}
              </div>
              <span className="block h-px bg-[var(--color-rule,var(--color-line))]" />
              <div className="flex flex-1 items-start">
                {!positive && (
                  <span
                    className="w-full rounded-b-[4px] bg-[var(--color-minus)]"
                    style={{ height: `${ratio * 100}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-1 flex gap-1">
        {buckets.map((b) => (
          <span
            key={b.key}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-[var(--color-muted)]"
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * 累計収支の折れ線。
 * 形だけSVGで描き、目盛りの数字はHTMLで重ねる。
 * 横に引き伸ばすため preserveAspectRatio を切り、線の太さだけ保つ。
 */
export function CumulativeLine({ points }: { points: CumulativePoint[] }) {
  if (points.length === 0) return null

  const values = points.map((p) => p.total)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  // 1点しか無いと線が引けないので、同じ高さで横に伸ばす
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? 50 : (i / (points.length - 1)) * 100
    const y = 100 - ((p.total - min) / span) * 100
    return { x, y }
  })

  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `0,${coords[0].y} ${line} 100,${coords[coords.length - 1].y} 100,100 0,100`
  const zeroY = 100 - ((0 - min) / span) * 100
  const last = points[points.length - 1]
  const positive = last.total >= 0

  return (
    <div>
      <div className="relative h-40">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={`累計収支の推移。最新は${formatYen(last.total)}`}
        >
          <polygon
            points={area}
            fill={positive ? 'var(--color-plus)' : 'var(--color-minus)'}
            opacity="0.12"
          />
          {/* 0の基準線。範囲外なら描かない */}
          {zeroY >= 0 && zeroY <= 100 && (
            <line
              x1="0"
              y1={zeroY}
              x2="100"
              y2={zeroY}
              stroke="var(--color-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <polyline
            points={line}
            fill="none"
            stroke={positive ? 'var(--color-plus)' : 'var(--color-minus)'}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* 最新の値だけ直接ラベルを置く。全点に数字を出すと読めなくなる */}
        <span
          className="pointer-events-none absolute right-0 -translate-y-1/2 rounded bg-[var(--color-surface)] px-1.5 text-xs font-semibold tabular-nums"
          style={{
            top: `${coords[coords.length - 1].y}%`,
            color: positive ? 'var(--color-plus)' : 'var(--color-minus)',
          }}
        >
          {formatYen(last.total)}
        </span>
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted)]">
        <span>{points[0].date}</span>
        <span>{last.date}</span>
      </div>
    </div>
  )
}

/** 機種別・店舗別・曜日別の一覧。左に名前、右に収支、背景に長さで比較できる帯を敷く */
export function BucketList({
  buckets,
  emptyLabel = '記録がありません',
}: {
  buckets: Bucket[]
  emptyLabel?: string
}) {
  const withData = buckets.filter((b) => b.count > 0)
  if (withData.length === 0) {
    return <p className="py-4 text-center text-xs text-[var(--color-muted)]">{emptyLabel}</p>
  }

  const maxAbs = Math.max(...withData.map((b) => Math.abs(b.profit)), 1)

  return (
    <ul className="space-y-2">
      {withData.map((b) => {
        const positive = b.profit >= 0
        return (
          <li key={b.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{b.label}</span>
              <span
                className="shrink-0 tabular-nums"
                style={{ color: positive ? 'var(--color-plus)' : 'var(--color-minus)' }}
              >
                {formatYen(b.profit)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-line)]">
                <span
                  className="block h-full rounded-[4px]"
                  style={{
                    width: `${(Math.abs(b.profit) / maxAbs) * 100}%`,
                    backgroundColor: positive ? 'var(--color-plus)' : 'var(--color-minus)',
                  }}
                />
              </span>
              <span className="shrink-0 text-[10px] text-[var(--color-muted)] tabular-nums">
                {b.count}台 / 勝率{b.winRate === null ? '--' : Math.round(b.winRate * 100)}%
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
