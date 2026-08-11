/**
 * ジャグラー実戦記録ツール - ドメイン型定義
 *
 * 確率の表記ルール:
 *   1/x の「分母 x」を number で保持する。例) 1/273.1 → 273.1
 *   0除算を避けるため、分母が算出できない場合(母数0など)は null を返す設計とする。
 */

/** データカウンターのスナップショット(着席時 / 離席時) */
export interface CounterSnapshot {
  /** 総回転数 */
  games: number
  /** BB回数 */
  bb: number
  /** RB回数 */
  rb: number
  /**
   * 差枚数。ホールや機種のデータカウンターによっては表示されないため null を許容する。
   */
  medals: number | null
}

/** 自分が打った実績(実戦カウンター画面で計上する) */
export interface MyCount {
  /** 自分の消化G数 */
  games: number
  bb: number
  rb: number
  /** ぶどう回数(手動カウント) */
  grape: number
  /**
   * 単独REG回数(チェリー重複ではないREG)。
   * 設定差がぶどうより大きく判別力が高いため、カウントできる場合は最優先で使う。
   */
  soloRb: number
  /** チェリー重複REG回数 */
  cherryRb: number
}

/**
 * 分類済みのREG回数。
 * soloRb + cherryRb であり、rb(REG総数)との差が「分類できなかったREG」になる。
 *
 * これを持たないと「単独REGが0回だった」(強い低設定の証拠)と
 * 「単独REGを計測していない」(証拠なし)が区別できず、設定推測の結論が反転しうる。
 */
export function classifiedRb(count: MyCount): number {
  return count.soloRb + count.cherryRb
}

/** 実戦セッション(1台 = 1レコード) */
export interface Session {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** 店名 */
  hall: string
  /** 台番号 */
  machineNo: string
  /** 機種マスタ MachineSpec.id への参照 */
  machineTypeId: string

  /** 着席時のデータカウンター(前任者ぶんを含む) */
  start: CounterSnapshot
  /** 離席時のデータカウンター。実戦中は null */
  end: CounterSnapshot | null
  /** 自分の実績 */
  myCount: MyCount

  /** 投資額(円) */
  invest: number
  /** 回収枚数 */
  payoutMedals: number
  /** 交換率(メダル1枚あたりの円)。例) 等価=20.0、5.6枚交換≒17.86 */
  exchangeRate: number

  /** 実働時間の算出用(ISO8601) */
  startedAt: string
  endedAt: string | null

  memo: string

  /** 実戦中かどうか。ホーム画面から復帰するために使う */
  status: 'active' | 'finished'
}

/** 機種マスタ: 設定ごとの理論値 */
export interface SettingSpec {
  setting: 1 | 2 | 3 | 4 | 5 | 6
  /** BB確率の分母。メーカー公表値ベースで確度が高い */
  bbProb: number
  /** RB確率の分母。同上 */
  rbProb: number
  /** 合算確率の分母 */
  totalProb: number
  /**
   * ぶどう確率の分母。
   * 北電子は小役確率を公表していないため、これは第三者の解析値である。
   * 機種によっては複数系統が流通しており、その場合は grapeProbAlt に対立系統を持つ。
   */
  grapeProb: number
  /** 対立するぶどう確率系統(存在する場合)。感度分析と暫定値表示に使う */
  grapeProbAlt: number | null
  /**
   * 単独REG確率の分母(チェリー重複ではないREG)。
   * 設定差がぶどうより大きく(機種により約2倍)、判別力が最も高い。
   * 解析値が得られなかった場合は null。
   */
  soloRbProb: number | null
  /** 出玉率(%) */
  payoutRate: number
}

/** 機種マスタ */
export interface MachineSpec {
  id: string
  /** 機種名 */
  name: string
  maker: string
  releaseYear: number | null
  /** 6号機 / 6.5号機 / スマスロ など */
  spec: string
  /**
   * ボーナス1回あたりの平均消化ゲーム数。
   *
   * ぶどう確率は「通常時のゲーム数」を分母に数えるのが実務ルールだが、
   * 台のデータカウンターの総回転数にはボーナス消化中のゲームも含まれる。
   * この値で `通常時G数 = 総G数 − (BB回数×big + RB回数×reg)` を推定する。
   * 補正しないとぶどう確率が約1割悪く出て、判別が低設定側へ丸ごとずれる。
   *
   * 裏が取れていない場合は null。その場合は補正せず、UIにその旨を明示する。
   */
  bonusGames: { big: number; reg: number } | null
  /** 設定1〜6(必ず6件) */
  settings: SettingSpec[]
  /*
   * ぶどうの設定差構造は機種ごとにバラバラ(全設定別値 / 設定1〜4共通 / 設定1〜5共通)なので、
   * マスタに固定値を持たせず settings の数値から自動判定する。
   * → src/lib/discrimination.ts の grapeDiffType() / primaryIndicator()
   */
  /** ぶどう以外の判別要素などの補足 */
  notes: string
  /**
   * 数値の検証状態。
   * 'verified'   … 複数の情報源で裏が取れている
   * 'provisional'… 暫定値。UI上に注意表示を出す
   */
  dataStatus: 'verified' | 'provisional'
  /** 出典URL */
  sources: string[]
}

/** アプリ設定 */
export interface AppSettings {
  id: 'singleton'
  /** 既定の交換率(円/枚) */
  defaultExchangeRate: number
  /** 既定の店名(入力の手間を減らす) */
  defaultHall: string
  /** 既定の機種 */
  defaultMachineTypeId: string | null
  /** やめ時サジェストの閾値: 設定1+2の合計確率がこの値(%)を超えたら警告 */
  lowSettingAlertThreshold: number
  /** 設定判別を「参考値」扱いにするG数の下限 */
  reliableGamesThreshold: number
}
