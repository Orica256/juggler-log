/**
 * カウント用の固定フッター
 *
 * 画面下部に固定するのは、スマホを片手で持ったときに親指が届く範囲がここだけのため。
 *
 * 配置は「押す頻度」で決めている。
 * ぶどうは1000Gあたり約170回押すのに対し、ボーナス系は数回しか押さない。
 * そのため最下段の全幅(親指が最も楽に届く帯)をぶどうに割り当て、
 * 押し間違えると1回消える「取り消し」は、逆にいちばん遠い最上段の端へ置く。
 * 推奨指標が単独REGの機種でも、この配置は頻度で決まるので変えない。
 *
 * タップは click ではなく pointerdown で拾う。
 * 片手で170回叩くと指は必ず滑るので、click(押下と離上が同じ要素)だと
 * ボタン外で離した回が無音で消える。
 * あわせて touch-action: none を指定し、ダブルタップズーム判定による
 * 約300msの遅延と、スクロール開始との取り違えを防ぐ。
 */
import { COUNT_LABELS, buzz, type CountAction } from '../lib/counting'

const REG_BUTTONS: { action: CountAction; label: string; sub: string }[] = [
  { action: 'bb', label: 'BB', sub: '' },
  { action: 'soloRb', label: '単独', sub: 'REG' },
  { action: 'cherryRb', label: 'チェリー', sub: 'REG' },
  { action: 'unknownRb', label: '不明', sub: 'REG' },
]

export function CountPad({
  onCount,
  onUndo,
  undoTarget,
  recommended,
  grapeCount,
}: {
  onCount: (action: CountAction) => void
  onUndo: () => void
  /** 直前の操作。取り消せない場合は null */
  undoTarget: CountAction | null
  /** その機種で数えるべき指標 */
  recommended: 'grape' | 'soloRb'
  /** ボタン面に出す現在のぶどう回数。iOSは振動が効かないので視覚で返す */
  grapeCount: number
}) {
  const press = (action: CountAction) => {
    buzz()
    onCount(action)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div className="mx-auto max-w-md px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex h-9 items-center justify-end gap-2">
          <span className="text-[10px] text-[var(--color-muted)]">
            {undoTarget ? `直前: ${COUNT_LABELS[undoTarget]}` : '直前の操作なし'}
          </span>
          <button
            type="button"
            onClick={() => {
              buzz(20)
              onUndo()
            }}
            disabled={undoTarget === null}
            className="h-8 rounded-lg border border-[var(--color-line)] px-3 text-xs text-[var(--color-muted)] transition active:bg-[var(--color-line)] disabled:opacity-30"
          >
            取り消し
          </button>
        </div>

        <div className="mt-1 grid grid-cols-4 gap-2">
          {REG_BUTTONS.map((b) => (
            <button
              key={b.action}
              type="button"
              onPointerDown={() => press(b.action)}
              style={{ touchAction: 'none' }}
              className="flex h-14 flex-col items-center justify-center rounded-xl bg-[var(--color-line)] text-sm font-semibold leading-tight active:brightness-125"
            >
              <span>
                {b.label}
                {b.action === 'soloRb' && recommended === 'soloRb' && (
                  <span className="ml-1 text-[10px] text-[var(--color-accent)]">推奨</span>
                )}
              </span>
              {b.sub && <span className="text-[10px] font-normal">{b.sub}</span>}
            </button>
          ))}
        </div>

        <button
          type="button"
          onPointerDown={() => press('grape')}
          style={{ touchAction: 'none' }}
          className="mt-2 flex h-20 w-full items-center justify-between rounded-2xl bg-[var(--color-accent)] px-6 text-black transition active:brightness-90"
        >
          <span className="text-xl font-bold">
            ぶどう ＋1
            {recommended === 'grape' && <span className="ml-1.5 text-xs">推奨</span>}
          </span>
          <span className="text-3xl font-bold tabular-nums">
            {grapeCount.toLocaleString('ja-JP')}
          </span>
        </button>
      </div>
    </div>
  )
}
