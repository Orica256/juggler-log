import type { ReactNode } from 'react'
import { ScreenHeader } from '../components/ui'

/**
 * 使い方の説明。
 *
 * ホールで「この欄は何を入れるんだったか」を確認する用途なので、
 * 全部開いた長文ではなく、見出しから畳んだ状態で置いて必要な項目だけ開ける形にする。
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="border-b border-[var(--color-line)] py-1">
      <summary className="cursor-pointer list-none py-3 text-sm font-semibold marker:content-none">
        <span className="mr-2 text-[var(--color-muted)]">▸</span>
        {title}
      </summary>
      <div className="pb-4 pl-5 text-sm leading-relaxed text-[var(--color-text)]">{children}</div>
    </details>
  )
}

/** 用語や項目の説明を「名前 → 説明」の形で並べる */
function Terms({ items }: { items: { term: string; body: ReactNode }[] }) {
  return (
    <dl className="space-y-3">
      {items.map((item) => (
        <div key={item.term}>
          <dt className="font-semibold">{item.term}</dt>
          <dd className="mt-0.5 text-[var(--color-muted)]">{item.body}</dd>
        </div>
      ))}
    </dl>
  )
}

/** とくに間違えると記録が狂う箇所を目立たせる */
function Caution({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-[var(--color-minus)] px-3 py-2 text-xs leading-relaxed text-[var(--color-minus)]">
      {children}
    </p>
  )
}

export function Help({ navigate }: { navigate: (to: string, replace?: boolean) => void }) {
  return (
    <div className="pb-12">
      <ScreenHeader title="使い方" onBack={() => navigate('/', true)} />

      <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted)]">
        このアプリは「打った台のデータを残して、あとで振り返る」ためのものです。
        設定推測もできますが、1台ぶんのデータで設定を当てられるものではありません。
        まずは収支の記録から始めるのがおすすめです。
      </p>

      <Section title="ジャグラーの用語">
        <Terms
          items={[
            {
              term: 'BB(ビッグボーナス)',
              body: '大きいほうのボーナス。約240枚(アイム系は約252枚)獲得できます。BIGとも書きます。',
            },
            {
              term: 'RB(レギュラーボーナス)',
              body: '小さいほうのボーナス。約96枚獲得できます。REGとも書きます。',
            },
            {
              term: '合算(ごうさん)',
              body: 'BBとRBを合わせた当たり確率。「1/150」なら150回転に1回ボーナスが来ている計算です。数字が小さいほど当たっています。',
            },
            {
              term: 'ぶどう',
              body: 'いちばん頻繁に揃う小役。約6回転に1回揃います。設定が高いほどわずかに出やすくなるため、設定推測の材料になります。',
            },
            {
              term: '単独REG(たんどくレグ)',
              body: 'チェリーと同時ではなく、単独で当たったREGのこと。ぶどうより設定差が大きく、判別の材料として優秀です。',
            },
            {
              term: 'ペカ',
              body: '告知ランプ(GOGO!ランプ)が光ること。光ったらボーナス確定です。',
            },
            {
              term: '差枚(さまい)',
              body: '入れたメダルと出たメダルの差。プラスなら出ている台です。台上のデータカウンターに表示されます。',
            },
            {
              term: '設定1〜6',
              body: '店が台ごとに決める出やすさ。6がいちばん出やすく、1がいちばん出ません。外からは見えないので、実際に打った数字から推測することになります。',
            },
            {
              term: '交換率',
              body: 'メダル1枚を何円で換金できるか。「等価」なら1枚20円、「5.6枚交換」なら5.6枚で100円(1枚あたり約17.9円)です。店ごとに違うので確認してください。',
            },
          ]}
        />
      </Section>

      <Section title="打ち始めるとき(実戦開始)">
        <p>ホーム画面の「＋ 新規実戦をはじめる」から入ります。</p>
        <div className="mt-3">
          <Terms
            items={[
              { term: '日付', body: '今日の日付が最初から入っています。基本そのままで大丈夫です。' },
              { term: '店名 / 台番号', body: 'あとで振り返るための情報です。店名は次回から自動で入ります。' },
              {
                term: '機種',
                body: '選ぶと、その機種で「数えるべき指標」が自動で表示されます。機種によってぶどうを数えるべきか単独REGを数えるべきかが変わるためです。',
              },
              {
                term: '着席時のデータカウンター',
                body: '台の上や横にある表示器の数字を、そのまま入れてください。総回転数・BB回数・RB回数・差枚数の4つです。',
              },
            ]}
          />
        </div>
        <Caution>
          ここに入れるのは「前の人が打ったぶんを含んだ、今表示されている数字」です。
          0から入れ直す必要はありません。あとで離席時の数字との差を取って、自分のぶんだけを計算します。
        </Caution>
        <p className="mt-3 text-[var(--color-muted)]">
          差枚数が表示されない台もあります。その場合は空欄のままで構いません。
        </p>
      </Section>

      <Section title="打っている間(実戦中)">
        <p>いちばん使う画面です。画面の下に固定されたボタンで数えていきます。</p>

        <h3 className="mt-4 font-semibold">下のボタン</h3>
        <div className="mt-2">
          <Terms
            items={[
              {
                term: 'ぶどう ＋1(いちばん大きいボタン)',
                body: 'ぶどうが揃うたびに押します。押した回数がボタンの右に出るので、画面を見なくても増えたか確認できます。',
              },
              { term: 'BB', body: 'BIGボーナスを引いたときに1回押します。' },
              {
                term: '単独REG',
                body: 'REGを引いたとき、チェリーと同時ではなかった場合に押します。',
              },
              {
                term: 'チェリーREG',
                body: 'REGを引いたとき、チェリーと同時だった場合に押します。',
              },
              {
                term: '不明REG',
                body: 'REGを引いたが、単独かチェリーか分からなかったときに押します。適当にどちらかを押してはいけません。',
              },
              {
                term: '取り消し(右上)',
                body: '直前に押したものを1回ぶん取り消します。何を取り消すかは左に表示されます。',
              },
            ]}
          />
        </div>

        <h3 className="mt-4 font-semibold">上の入力欄</h3>
        <div className="mt-2">
          <Terms
            items={[
              {
                term: '台の総回転数',
                body: '台の表示器の数字を、ときどき入れ直してください。着席時の数字との差から「自分が回した回転数」が自動で計算されます。',
              },
              {
                term: '投資',
                body: '1000円追加するたびに「＋1,000円」を押します。押しすぎたら「−1,000」で戻せます。',
              },
            ]}
          />
        </div>
        <p className="mt-3 text-[var(--color-muted)]">
          押し間違いに後から気づいたときは、下のほうにある「カウントの修正」で数字を直接直せます。
        </p>
      </Section>

      <Section title="ぶどう・単独REGの数え方(重要)">
        <p>数え方を間違えると、確率がずれて判別の意味がなくなります。</p>

        <h3 className="mt-4 font-semibold">ぶどうを数えるとき</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>通常時(いつも打っているとき)のぶどうだけを数えます</li>
          <li>ボーナス中に揃うぶどうは数えません</li>
          <li>
            ボーナスが光ったあと、揃えるまでの数ゲームは数えます(3枚掛けで打っている限り対象です)
          </li>
          <li>
            1枚掛け(いわゆるブドウ抜き)で回したぶんは数えません
          </li>
        </ul>
        <p className="mt-2 text-[var(--color-muted)]">
          ボーナス中のゲーム数は、アプリ側で自動的に差し引いて計算しています。
        </p>

        <h3 className="mt-4 font-semibold">単独REGを見分けるには</h3>
        <p className="mt-1 text-[var(--color-muted)]">
          左のリールにチェリーを狙って打つ必要があります。チェリーが出ていないのにREGが当たっていれば
          「単独REG」、チェリーと同時なら「チェリーREG」です。
        </p>
        <Caution>
          ランプが光ってからチェリーを狙わずに揃えてしまうと、どちらだったか分からなくなります。
          その場合は必ず「不明REG」を押してください。推測でどちらかに寄せると、1回の間違いで
          判別結果が大きく狂います。
        </Caution>
        <p className="mt-3 text-[var(--color-muted)]">
          面倒であれば、単独REGは数えずぶどうだけでも構いません。その場合も収支の記録は問題なく残ります。
        </p>
      </Section>

      <Section title="数字の読み方">
        <div className="mt-1">
          <Terms
            items={[
              {
                term: '「1/150.00」のような表示',
                body: '何回転に1回その役が来ているか、という意味です。数字が小さいほど良い状態です。',
              },
              {
                term: '横棒(メーター)と丸印',
                body: '左端が設定1の理論値、右端が設定6の理論値です。丸印が右寄りなら高設定寄りの数字が出ている、という目安になります。',
              },
              {
                term: '中が空洞の丸印',
                body: '理論値の範囲を超えて振れている状態です。たまたま良すぎる(悪すぎる)だけのことが多いので、あてにしないでください。',
              },
              {
                term: '「数える」の印',
                body: 'その機種で最も判別に役立つ指標です。機種ごとに自動で切り替わります。',
              },
              {
                term: '参考値 / 目安 / 十分',
                body: 'どれくらいデータが溜まったかの目印です。「参考値」の間は、数字が良くても悪くてもほとんど意味がありません。',
              },
            ]}
          />
        </div>
        <Caution>
          1台を1日打った程度では、ほとんどの指標が「参考値」のままです。設定を断定できるものではなく、
          あくまで「やめるか続けるかの材料のひとつ」として見てください。
        </Caution>
        <p className="mt-3 text-[var(--color-muted)]">
          なお、ぶどうと単独REGの理論値はメーカーが公表しておらず、解析した人によって数字が食い違います。
          その機種は「暫定値」と表示されます(設定画面で確認できます)。
        </p>
      </Section>

      <Section title="やめるとき(実戦終了)">
        <p>実戦中の画面の下にある「実戦を終了する」から入ります。</p>
        <div className="mt-3">
          <Terms
            items={[
              {
                term: '離席時のデータカウンター',
                body: '席を立つときの台の数字を入れます。着席時との差から、自分が回した実績が自動で出ます。',
              },
              {
                term: '回収枚数',
                body: '流したメダルの枚数です。計数機のレシートに出ている数字を入れてください。',
              },
              {
                term: '交換率',
                body: '等価なら「等価(5.0枚)」を選びます。ここを間違えると収支が合いません。',
              },
            ]}
          />
        </div>
        <p className="mt-3 text-[var(--color-muted)]">
          「記録を確定する」を押すと収支が確定します。あとから直したくなったら、履歴から開いて「編集」できます。
        </p>
      </Section>

      <Section title="記録が消えないようにする">
        <p>
          記録はこのスマホの中だけに保存されます。外部に送られることはありませんが、
          そのぶん端末側の都合で消えることがあります。
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--color-muted)]">
          <li>必ずホーム画面のアイコンから起動してください(設定画面で確認できます)</li>
          <li>ときどき設定画面から「CSVに書き出す」でバックアップを取ってください</li>
          <li>機種変更のときは、書き出したファイルを新しい端末で「CSVから読み込む」で戻せます</li>
        </ul>
        <Caution>
          ブラウザのタブで開いたまま使っていると、iPhoneでは7日間開かなかっただけで記録が消えることがあります。
        </Caution>
      </Section>

      <Section title="うまく動かないとき">
        <div className="mt-1">
          <Terms
            items={[
              {
                term: '画面が新しくならない',
                body: 'アプリを完全に終了(アプリ切り替え画面で上にスワイプ)してから開き直してください。',
              },
              {
                term: '確率が「---」のまま',
                body: 'まだ回数が0のときはそう表示されます。数え始めれば出てきます。',
              },
              {
                term: 'ボタンを押しても増えていない気がする',
                body: 'ぶどうボタンの右にある数字を見てください。そこが増えていれば記録されています。',
              },
            ]}
          />
        </div>
      </Section>
    </div>
  )
}
