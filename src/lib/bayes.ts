/**
 * ベイズ推定による設定判別
 *
 * 観測した回数から、設定1〜6それぞれの「もっともらしさ」を求める。
 *
 * ■ 尤度の組み立て
 * 事前分布は一様(各1/6)。尤度は次の4つに分けて掛け合わせる。
 *
 *   1. ボーナス … BB / RB / どちらも引かなかったゲーム の多項分布。
 *      BBとRBを別々の二項分布として扱うと「どちらも引かなかった」ぶんを二重に数えるため、
 *      まとめて多項分布にする。
 *   2. ぶどう … 二項分布。母数は通常時ゲーム数(ボーナス消化ぶんを除いたG数)。
 *   3. 単独REG … 「REGを引いたとき、それが単独である条件付き確率」の二項分布。
 *      母数は分類できたREGの回数だけを使う。
 *      P(単独 | REG) = REG確率 ÷ 単独REG確率 で求まる。
 *      こうすると「契機が分からなかったREG」を自然に除外でき、
 *      REGを引いたこと自体は 1. で既に数えているので二重計上にもならない。
 *
 * 二項係数などの定数項は設定によらず同じで、正規化のときに打ち消えるため計算しない。
 */
import { normalGames } from './calc'
import { classifiedRb, type MachineSpec, type MyCount, type SettingSpec } from '../types'

export type IndicatorKey = 'bonus' | 'grape' | 'soloRb'

/** 設定ごとの事後確率 */
export interface SettingProbability {
  setting: number
  /** 0〜1 */
  probability: number
}

/** 指標ごとの寄与。その指標だけで見たときの結論を出す */
export interface IndicatorContribution {
  key: IndicatorKey
  label: string
  /** 観測した回数。母数と件数 */
  observed: { count: number; trials: number } | null
  /** その指標だけから推定した期待設定(1〜6)。判断材料が無ければ null */
  expectedSetting: number | null
  /** 判断材料として使えたか。使えない理由も持つ */
  usable: boolean
  reason: string | null
}

export interface Estimation {
  /** 設定1〜6の事後確率 */
  posterior: SettingProbability[]
  /** 期待設定(事後分布の平均)。1〜6 */
  expectedSetting: number
  /** 設定1・2の合計確率。やめ時の判断に使う */
  lowProbability: number
  /** 設定5・6の合計確率 */
  highProbability: number
  /** 最ももっともらしい設定 */
  mostLikely: number
  /** 指標ごとの寄与 */
  contributions: IndicatorContribution[]
  /** 観測が乏しく、事前分布からほとんど動いていない状態か */
  weak: boolean
}

const SETTINGS = [1, 2, 3, 4, 5, 6] as const

/** 二項分布の対数尤度(定数項を除く) */
function logBinomial(trials: number, hits: number, p: number): number | null {
  if (trials <= 0 || hits < 0 || hits > trials) return null
  if (!(p > 0 && p < 1)) return null
  return hits * Math.log(p) + (trials - hits) * Math.log(1 - p)
}

/** ボーナスの多項分布(BB / RB / どちらでもない)の対数尤度 */
function logBonus(games: number, bb: number, rb: number, spec: SettingSpec): number | null {
  if (games <= 0) return null
  const pBb = 1 / spec.bbProb
  const pRb = 1 / spec.rbProb
  const pNone = 1 - pBb - pRb
  const none = games - bb - rb
  // 回数がG数を超えている(入力ミス)場合は判断材料にしない
  if (none < 0 || pNone <= 0) return null
  return bb * Math.log(pBb) + rb * Math.log(pRb) + none * Math.log(pNone)
}

/** REGを引いたとき、それが単独である条件付き確率 */
function soloGivenRb(spec: SettingSpec): number | null {
  if (spec.soloRbProb === null || spec.soloRbProb <= 0) return null
  const p = spec.rbProb / spec.soloRbProb
  return p > 0 && p < 1 ? p : null
}

/** 対数尤度の配列を事後確率へ直す。最大値を引いてから指数化し、桁あふれを避ける */
function normalize(logLikelihoods: number[]): number[] {
  const max = Math.max(...logLikelihoods)
  const weights = logLikelihoods.map((l) => Math.exp(l - max))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return logLikelihoods.map(() => 1 / logLikelihoods.length)
  return weights.map((w) => w / total)
}

/** 事後分布から期待設定を求める */
function expectedOf(posterior: number[]): number {
  return SETTINGS.reduce((sum, setting, i) => sum + setting * posterior[i], 0)
}

function settingsInOrder(machine: MachineSpec): SettingSpec[] | null {
  const ordered = SETTINGS.map((s) => machine.settings.find((x) => x.setting === s))
  return ordered.every((s): s is SettingSpec => s !== undefined) ? ordered : null
}

export interface EstimateOptions {
  /**
   * ぶどうの理論値として、対立する解析値(grapeProbAlt)のほうを使う。
   * 解析値が割れている機種で結論が変わらないかを確かめるために使う。
   */
  useAltGrape?: boolean
}

/**
 * どの設定もこの確率に届かなければ「判断材料が足りない」とみなす。
 *
 * 一様分布ではどれも 16.7%。設定6の理論値どおりに当たり続けた場合で計測すると、
 * 最大確率は 300G で 18%、1000G で 20%、2000G で 31%、1万Gで 64% と動く。
 * 25%を境にすると、実感に近いところ(2000G前後)で「材料が乏しい」表示が外れる。
 */
const WEAK_MAX_PROBABILITY = 0.25

export function estimateSetting(
  machine: MachineSpec,
  count: MyCount,
  options: EstimateOptions = {},
): Estimation {
  const specs = settingsInOrder(machine)
  const uniform = SETTINGS.map(() => 1 / SETTINGS.length)

  if (!specs) {
    return buildResult(uniform, [], true)
  }

  const normal = normalGames(count, machine)
  const classified = classifiedRb(count)

  /** 指標ごとに、設定1〜6の対数尤度を求める。1つでも計算できなければ採用しない */
  const collect = (fn: (spec: SettingSpec) => number | null): number[] | null => {
    const values = specs.map(fn)
    return values.every((v): v is number => v !== null) ? values : null
  }

  const bonusLL = collect((spec) => logBonus(count.games, count.bb, count.rb, spec))

  const grapeLL = collect((spec) => {
    const denominator = options.useAltGrape ? (spec.grapeProbAlt ?? spec.grapeProb) : spec.grapeProb
    return logBinomial(normal.games, count.grape, 1 / denominator)
  })

  const soloLL = collect((spec) => {
    const p = soloGivenRb(spec)
    return p === null ? null : logBinomial(classified, count.soloRb, p)
  })

  const total = SETTINGS.map(
    (_, i) => (bonusLL?.[i] ?? 0) + (grapeLL?.[i] ?? 0) + (soloLL?.[i] ?? 0),
  )
  const posterior = bonusLL || grapeLL || soloLL ? normalize(total) : uniform

  const contributions: IndicatorContribution[] = [
    buildContribution('bonus', 'ボーナス(BB / REG)', bonusLL, {
      count: count.bb + count.rb,
      trials: count.games,
    }, count.games <= 0 ? 'まだ回していない' : '回数がG数と合わない'),

    buildContribution('grape', 'ぶどう', grapeLL, {
      count: count.grape,
      trials: normal.games,
    }, count.grape <= 0 ? 'まだ数えていない' : '理論値が無い'),

    buildContribution('soloRb', '単独REG', soloLL, {
      count: count.soloRb,
      trials: classified,
    }, classified <= 0 ? 'REGの契機をまだ分類していない' : 'この機種は単独REGの解析値が無い'),
  ]

  return buildResult(posterior, contributions, isWeak(posterior))
}

function buildContribution(
  key: IndicatorKey,
  label: string,
  logLikelihoods: number[] | null,
  observed: { count: number; trials: number },
  unusableReason: string,
): IndicatorContribution {
  if (!logLikelihoods) {
    return { key, label, observed: null, expectedSetting: null, usable: false, reason: unusableReason }
  }
  return {
    key,
    label,
    observed,
    // その指標だけを一様な事前分布に掛けた場合の期待設定
    expectedSetting: expectedOf(normalize(logLikelihoods)),
    usable: true,
    reason: null,
  }
}

/** 事後分布がまだ一様に近く、材料が乏しいか */
function isWeak(posterior: number[]): boolean {
  return Math.max(...posterior) < WEAK_MAX_PROBABILITY
}

function buildResult(
  posterior: number[],
  contributions: IndicatorContribution[],
  weak: boolean,
): Estimation {
  const probabilities = SETTINGS.map((setting, i) => ({ setting, probability: posterior[i] }))
  const mostLikely = probabilities.reduce((best, cur) =>
    cur.probability > best.probability ? cur : best,
  ).setting

  return {
    posterior: probabilities,
    expectedSetting: expectedOf(posterior),
    lowProbability: posterior[0] + posterior[1],
    highProbability: posterior[4] + posterior[5],
    mostLikely,
    contributions,
    weak,
  }
}

export interface Sensitivity {
  /** 対立する解析値が存在し、比較できたか */
  available: boolean
  /** 採用値と対立値で結論が変わるか */
  flipped: boolean
  /** 対立値で計算した場合の期待設定 */
  altExpectedSetting: number | null
}

/**
 * ぶどうの解析値が割れている機種で、どちらを採用するかによって結論が変わらないかを調べる。
 *
 * 「設定1・2寄り」「どちらとも言えない」「設定5・6寄り」の3つに分けて、
 * 判定が変わる場合だけ警告する。小数点以下のぶれは無視する。
 */
export function checkGrapeSensitivity(machine: MachineSpec, count: MyCount): Sensitivity {
  const hasAlt = machine.settings.some((s) => s.grapeProbAlt !== null)
  if (!hasAlt) return { available: false, flipped: false, altExpectedSetting: null }

  const base = estimateSetting(machine, count)
  const alt = estimateSetting(machine, count, { useAltGrape: true })

  const verdict = (e: Estimation) => {
    if (e.lowProbability > 0.5) return 'low'
    if (e.highProbability > 0.5) return 'high'
    return 'unclear'
  }

  return {
    available: true,
    flipped: verdict(base) !== verdict(alt),
    altExpectedSetting: alt.expectedSetting,
  }
}
