/**
 * 設定判別の「指標選び」に関するロジック
 *
 * ジャグラーは機種ごとにぶどうの設定差構造がまったく異なる。
 *   ゴーゴージャグラー3      … 設定1〜6がすべて別値
 *   アイムジャグラーEX        … 設定1〜5が共通、設定6のみ優遇
 *   ウルトラミラクルジャグラー … 設定1〜4が共通、差が付くのは設定5と6のみ
 *
 * したがって「ぶどうを主指標にする」と決め打ちできない。
 * マスタに区分を手入力すると機種追加時に間違えるため、数値から自動判定する。
 *
 * ■ 判別力の測り方
 * 「設定1と設定6で何倍違うか」で比較してはいけない。
 * ぶどうは約1/6で出るため1000Gで約170回の試行が得られるのに対し、
 * REGは約1/300なので1000Gで3回程度しか得られない。
 * 相対差が小さくても試行数が多い指標のほうが速く収束するため、
 * 「差の大きさ」ではなく「1Gあたりに得られる情報量」で比較する必要がある。
 *
 * ここでは各設定をベルヌーイ試行とみなし、設定間のKLダイバージェンスの
 * 全ペア平均を「1Gあたりの情報量」として用いる。
 * 全ペア平均にすることで、アイムジャグラーEXのように
 * 「設定1〜5が同値(=その範囲の情報量ゼロ)」の指標が正しく低く評価される。
 */
import type { MachineSpec, SettingSpec } from '../types'

export type GrapeDiffType =
  /** 全設定が別値。ぶどうを主指標にできる */
  | 'graded'
  /** 一部の設定が同値。判別できる範囲が限られる */
  | 'partial'
  /** 全設定が同値。ぶどうは判別に使えない */
  | 'none'

/** ぶどう確率が同値の設定をグループ化する(値の昇順 = 良い順) */
export function grapeGroups(machine: MachineSpec): number[][] {
  const groups = new Map<number, number[]>()
  for (const s of machine.settings) {
    const key = s.grapeProb
    const list = groups.get(key)
    if (list) list.push(s.setting)
    else groups.set(key, [s.setting])
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, settings]) => settings)
}

/** ぶどうの設定差構造を数値から判定する */
export function grapeDiffType(machine: MachineSpec): GrapeDiffType {
  const groupCount = grapeGroups(machine).length
  if (groupCount >= machine.settings.length) return 'graded'
  if (groupCount <= 1) return 'none'
  return 'partial'
}

/** ベルヌーイ試行1回あたりのKLダイバージェンス */
function klPerGame(p: number, q: number): number {
  if (p <= 0 || p >= 1 || q <= 0 || q >= 1) return 0
  return p * Math.log(p / q) + (1 - p) * Math.log((1 - p) / (1 - q))
}

/**
 * その指標が1Gあたりに与える情報量(全設定ペアの対称KLの平均)。
 * 1設定でも数値が欠けていれば、比較が公平にならないため null を返す。
 */
export function informationPerGame(
  machine: MachineSpec,
  pick: (s: SettingSpec) => number | null,
): number | null {
  const probs: number[] = []
  for (const s of machine.settings) {
    const denominator = pick(s)
    if (denominator === null || denominator <= 0) return null
    probs.push(1 / denominator)
  }

  let sum = 0
  let count = 0
  for (let i = 0; i < probs.length; i++) {
    for (let j = i + 1; j < probs.length; j++) {
      sum += klPerGame(probs[i], probs[j]) + klPerGame(probs[j], probs[i])
      count += 2
    }
  }
  return count > 0 ? sum / count : null
}

/**
 * 設定1と設定6を見分けるのに必要なG数の目安。
 *
 * indicatorScores の情報量は全設定ペアの平均で、隣接設定どうしの難しさも含むため
 * 「1と6すら見分けられていない」の判断には厳しすぎる。
 * 画面に出す確からしさの段階は、実務で言う「1か6か」に合わせてこちらを使う。
 */
export function gamesToSeparateExtremes(
  machine: MachineSpec,
  pick: (s: SettingSpec) => number | null,
): number | null {
  const low = machine.settings.find((s) => s.setting === 1)
  const high = machine.settings.find((s) => s.setting === 6)
  if (!low || !high) return null

  const a = pick(low)
  const b = pick(high)
  if (a === null || b === null || a <= 0 || b <= 0) return null

  const p = 1 / a
  const q = 1 / b
  const kl = (klPerGame(p, q) + klPerGame(q, p)) / 2
  if (kl <= 0) return null
  // 係数2は、平均尤度比がおよそ7倍に達する水準に相当する経験則
  return Math.round(2 / kl)
}

export type IndicatorKey = 'soloRb' | 'grape' | 'rb' | 'total'

interface IndicatorDef {
  key: IndicatorKey
  label: string
  pick: (s: SettingSpec) => number | null
}

const INDICATORS: IndicatorDef[] = [
  { key: 'grape', label: 'ぶどう', pick: (s) => s.grapeProb },
  { key: 'soloRb', label: '単独REG', pick: (s) => s.soloRbProb },
  { key: 'rb', label: 'REG', pick: (s) => s.rbProb },
  { key: 'total', label: '合算', pick: (s) => s.totalProb },
]

export interface IndicatorScore {
  key: IndicatorKey
  label: string
  /** 1Gあたりの情報量。数値が揃っていない指標は null */
  information: number | null
  /**
   * 目安として、設定1と設定6を実用上区別できるまでに必要なG数。
   * 情報量の逆数を定数倍したもので、絶対値ではなく指標間の比較に使う。
   */
  gamesToDistinguish: number | null
}

/** 判別力の高い順に指標を並べる */
export function indicatorScores(machine: MachineSpec): IndicatorScore[] {
  return INDICATORS.map((def) => {
    const information = informationPerGame(machine, def.pick)
    return {
      key: def.key,
      label: def.label,
      information,
      // 経験則の係数。指標間の相対比較にのみ使う値なので厳密な統計的保証はない
      gamesToDistinguish: information && information > 0 ? Math.round(2 / information) : null,
    }
  }).sort((a, b) => (b.information ?? -1) - (a.information ?? -1))
}

export interface ManualCountAdvice {
  /** 手でカウントすべき指標 */
  key: 'grape' | 'soloRb'
  label: string
  /** 比較対象に対して何倍の情報量があるか(比較対象が無い場合は null) */
  ratio: number | null
  /** なぜそれを数えるのかの説明。UIにそのまま出す */
  reason: string
}

/**
 * 「実戦中に手でカウントする価値があるのはどれか」を返す。
 *
 * REG確率・合算確率は台のデータカウンターから自動で得られるため、数える必要がない。
 * プレイヤーが労力を割く必要があるのは ぶどう と 単独REG の2つだけなので、
 * この2つに絞って比較しないと「何を数えるべきか」の答えにならない。
 */
export function recommendedManualCount(machine: MachineSpec): ManualCountAdvice {
  const scores = indicatorScores(machine)
  const grape = scores.find((s) => s.key === 'grape')
  const soloRb = scores.find((s) => s.key === 'soloRb')

  const grapeInfo = grape?.information ?? null
  const soloInfo = soloRb?.information ?? null

  const diffType = grapeDiffType(machine)
  const caveats: string[] = []
  if (diffType === 'partial') {
    const groups = grapeGroups(machine)
      .filter((g) => g.length > 1)
      .map((g) => `設定${g.join('・')}`)
      .join(' / ')
    caveats.push(`ぶどうは ${groups} が同値のため、その範囲はぶどうでは区別できない`)
  } else if (diffType === 'none') {
    caveats.push('ぶどうは全設定共通のため判別に使えない')
  }

  // 単独REGの解析値が無い機種ではぶどうしか選択肢がない
  if (soloInfo === null) {
    return {
      key: 'grape',
      label: 'ぶどう',
      ratio: null,
      reason: ['この機種は単独REGの信頼できる解析値が無いため、ぶどうを数える', ...caveats].join('。'),
    }
  }

  if (grapeInfo === null || soloInfo > grapeInfo) {
    const ratio = grapeInfo && grapeInfo > 0 ? soloInfo / grapeInfo : null
    const head =
      ratio === null
        ? 'この機種は単独REGを数える'
        : `単独REGはぶどうの約${ratio.toFixed(1)}倍の情報量があるため、単独REGを数える`
    return {
      key: 'soloRb',
      label: '単独REG',
      ratio,
      reason: [head, ...caveats].join('。'),
    }
  }

  return {
    key: 'grape',
    label: 'ぶどう',
    ratio: soloInfo > 0 ? grapeInfo / soloInfo : null,
    reason: [
      `ぶどうは単独REGの約${(grapeInfo / soloInfo).toFixed(1)}倍の情報量があるため、ぶどうを数える`,
      ...caveats,
    ].join('。'),
  }
}

/** データカウンターから自動で得られる(手カウント不要の)指標 */
export const FREE_INDICATORS: IndicatorKey[] = ['rb', 'total']
