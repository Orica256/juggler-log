/**
 * 「こういうときは、これを押す」の早見表
 *
 * 用語の一覧を並べても、台の前で何が起きたのか分からなければボタンは押せない。
 * 順番を逆にして、目に見えた出来事から押すボタンを引けるようにする。
 *
 * 使い方の画面と、実戦中の画面の両方から出すので部品として切り出している。
 */

/** 出来事 → 押すボタン の1行 */
function Rule({
  event,
  hint,
  action,
  muted = false,
}: {
  event: string
  hint: string
  action: string
  /** 「押さない」など、操作が不要な行は目立たせない */
  muted?: boolean
}) {
  return (
    <li className="flex items-start gap-3 border-b border-[var(--color-line)] py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm">{event}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>
      </div>
      <span
        className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
          muted
            ? 'text-[var(--color-muted)]'
            : 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
        }`}
      >
        {action}
      </span>
    </li>
  )
}

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={item} className="flex gap-2 text-sm">
          <span className="shrink-0 text-[var(--color-muted)] tabular-nums">{i + 1}.</span>
          <span className="text-[var(--color-muted)]">{item}</span>
        </li>
      ))}
    </ol>
  )
}

export function CountGuide() {
  return (
    <div>
      <section>
        <h3 className="text-sm font-semibold">まず、打ち方はこれだけ</h3>
        <StepList
          items={[
            '左のリールに「チェリーが付いたBAR」を狙って止める',
            '真ん中と右のリールは適当でよい',
          ]}
        />
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          左だけ狙うのは、チェリーを取りこぼさないためです。チェリーが出たかどうかが、
          あとで「単独REG」か「チェリーREG」かの判断材料になります。
        </p>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">リールが止まったら</h3>
        <ul className="mt-1">
          <Rule
            event="メダルが8枚出た"
            hint="ぶどうが揃っています。いちばん多い役で、6回転に1回くらい出ます"
            action="ぶどう"
          />
          <Rule
            event="メダルが2枚だけ出た"
            hint="チェリーです。これ自体は数えません"
            action="押さない"
            muted
          />
          <Rule
            event="メダルが出なかった"
            hint="はずれです"
            action="押さない"
            muted
          />
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          ※ ハッピージャグラーVⅢ とミスタージャグラーはチェリーが4枚です。
          ほかに10枚(ピエロ)・14枚(ベル)が出ることもありますが、まれなので気にしなくて大丈夫です。
        </p>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">GOGO!ランプが光ったら</h3>
        <StepList
          items={[
            'そのゲームでチェリーが出ていたか覚えておく',
            '7を狙う。7が揃えばBIG',
            '7が揃わなければREG。BARを揃える',
          ]}
        />
        <ul className="mt-3">
          <Rule event="7が揃った(BIG)" hint="チェリーの有無は問いません" action="BB" />
          <Rule
            event="BARが揃った。チェリーは出ていなかった"
            hint="単独でREGを引いた、ということです"
            action="単独REG"
          />
          <Rule
            event="BARが揃った。チェリーも出ていた"
            hint="チェリーと同時にREGを引いた、ということです"
            action="チェリーREG"
          />
          <Rule
            event="BARが揃ったが、チェリーの有無が分からない"
            hint="推測で決めないでください。分からないまま記録するのが正解です"
            action="不明REG"
          />
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          ランプはレバーを叩いた瞬間に光ることも、リールが止まってから光ることもあります。
          どちらでも、光ったゲームでチェリーが出ていたかどうかで判断します。
          光った時点ではBIGかREGかは分かりません。
        </p>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">ボーナス中は数えません</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
          ボーナスが終わるまで、ぶどうボタンは押さなくて大丈夫です。
          ボーナス中のゲーム数はアプリが自動で差し引いています。
        </p>
      </section>
    </div>
  )
}
