/**
 * 収支・確率の計算(純関数)
 *
 * 母数が0のときは確率を算出できないため null を返す。
 * UI側は null を「---」と表示すること。
 */
import type { CounterSnapshot, MachineSpec, MyCount, Session } from '../types'

/** 1/x の分母 x を求める。母数または回数が0以下なら null */
export function probDenominator(trials: number, hits: number): number | null {
  if (trials <= 0 || hits <= 0) return null
  return trials / hits
}

/** 開始時と終了時のカウンター差分から、自分が回したG数などを求める */
export function counterDiff(
  start: CounterSnapshot,
  end: CounterSnapshot | null,
): { games: number; bb: number; rb: number; medals: number | null } | null {
  if (!end) return null
  return {
    games: end.games - start.games,
    bb: end.bb - start.bb,
    rb: end.rb - start.rb,
    medals: end.medals !== null && start.medals !== null ? end.medals - start.medals : null,
  }
}

/** 回収枚数を円に換算する */
export function medalsToYen(medals: number, exchangeRate: number): number {
  return Math.floor(medals * exchangeRate)
}

/** 収支(円)= 回収 - 投資 */
export function profit(session: Pick<Session, 'invest' | 'payoutMedals' | 'exchangeRate'>): number {
  return medalsToYen(session.payoutMedals, session.exchangeRate) - session.invest
}

/** 実働時間(時間)。終了していなければ現在時刻までを返す */
export function workedHours(startedAt: string, endedAt: string | null, now = new Date()): number {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : now.getTime()
  const ms = end - start
  return ms > 0 ? ms / 3_600_000 : 0
}

/** 時給(円/時)。実働時間が0なら null */
export function hourlyRate(
  session: Pick<Session, 'invest' | 'payoutMedals' | 'exchangeRate' | 'startedAt' | 'endedAt'>,
  now = new Date(),
): number | null {
  const hours = workedHours(session.startedAt, session.endedAt, now)
  if (hours <= 0) return null
  return Math.round(profit(session) / hours)
}

/** 自分の実績から各確率(分母)を求める */
export function myProbabilities(myCount: MyCount): {
  bb: number | null
  rb: number | null
  total: number | null
  grape: number | null
  soloRb: number | null
} {
  const { games, bb, rb, grape, soloRb } = myCount
  return {
    bb: probDenominator(games, bb),
    rb: probDenominator(games, rb),
    total: probDenominator(games, bb + rb),
    grape: probDenominator(games, grape),
    soloRb: probDenominator(games, soloRb),
  }
}

/**
 * 観測した確率が、設定1〜設定6の理論値のどのあたりに位置するかを 0〜1 で返す。
 * 0 が設定1相当、1 が設定6相当。範囲外は 0/1 に丸める。
 *
 * ジャグラーの指標はすべて「分母が小さいほど高設定」なので向きは共通。
 * これは目視用の目安であり、統計的な設定推測ではない(それは Phase 3)。
 */
export function settingPosition(
  observed: number | null,
  setting1: number,
  setting6: number,
): number | null {
  if (observed === null || !Number.isFinite(observed)) return null
  const span = setting1 - setting6
  if (span === 0) return null
  const ratio = (setting1 - observed) / span
  return Math.min(1, Math.max(0, ratio))
}

/**
 * ぶどうの分母に使う通常時ゲーム数を求める。
 *
 * ぶどうは通常時(3枚掛け)にしか数えないため、分母もボーナス消化ぶんを除いた
 * ゲーム数でなければならない。総回転数をそのまま使うと、ボーナス消化ぶん
 * (概ね1割)だけ分母が膨らみ、ぶどう確率が実際より悪く出る。
 *
 * `corrected: false` は機種マスタに平均消化G数が無く補正できなかったことを示す。
 * その場合は総G数をそのまま返すので、UI側で必ず断りを入れること。
 */
export function normalGames(
  count: MyCount,
  machine: MachineSpec,
): { games: number; corrected: boolean } {
  const spec = machine.bonusGames
  if (!spec) return { games: count.games, corrected: false }

  const bonus = count.bb * spec.big + count.rb * spec.reg
  return { games: Math.max(0, count.games - bonus), corrected: true }
}
