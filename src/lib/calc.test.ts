import { describe, expect, it } from 'vitest'
import {
  counterDiff,
  normalGames,
  settingPosition,
  hourlyRate,
  medalsToYen,
  myProbabilities,
  probDenominator,
  profit,
  workedHours,
} from './calc'
import type { CounterSnapshot, MachineSpec, MyCount } from '../types'
import { findMachine } from '../data/machines'

const counter = (games: number, bb: number, rb: number, medals: number | null = null): CounterSnapshot => ({
  games,
  bb,
  rb,
  medals,
})

describe('probDenominator', () => {
  it('1/x の分母を返す', () => {
    expect(probDenominator(3000, 20)).toBe(150)
  })

  it('母数が0なら null(0除算を避ける)', () => {
    expect(probDenominator(0, 0)).toBeNull()
  })

  it('当たりが0回なら null。「1/0」ではなく未算出として扱う', () => {
    expect(probDenominator(500, 0)).toBeNull()
  })
})

describe('counterDiff', () => {
  it('着席時と離席時の差から自分の実績を出す', () => {
    const diff = counterDiff(counter(12000, 40, 30, 1500), counter(15000, 52, 38, 900))
    expect(diff).toEqual({ games: 3000, bb: 12, rb: 8, medals: -600 })
  })

  it('離席時が未入力なら null', () => {
    expect(counterDiff(counter(1000, 3, 2), null)).toBeNull()
  })

  it('差枚は片方でも未取得なら null にする', () => {
    const diff = counterDiff(counter(1000, 3, 2, null), counter(2000, 6, 4, 500))
    expect(diff?.medals).toBeNull()
    // 差枚が取れなくても G数・BB・RB は算出できる
    expect(diff?.games).toBe(1000)
  })
})

describe('medalsToYen', () => {
  it('等価(20円/枚)で換算する', () => {
    expect(medalsToYen(1000, 20)).toBe(20000)
  })

  it('5.6枚交換で換算する。端数は切り捨てる', () => {
    // 1000枚 ÷ 5.6枚 × 100円 = 17857.14…円
    expect(medalsToYen(1000, 100 / 5.6)).toBe(17857)
  })

  it('0枚なら0円', () => {
    expect(medalsToYen(0, 20)).toBe(0)
  })
})

describe('profit', () => {
  it('回収から投資を引く', () => {
    expect(profit({ invest: 20000, payoutMedals: 1500, exchangeRate: 20 })).toBe(10000)
  })

  it('負けたときはマイナスになる', () => {
    expect(profit({ invest: 30000, payoutMedals: 500, exchangeRate: 20 })).toBe(-20000)
  })

  it('交換率が悪いと同じ枚数でも収支が下がる', () => {
    const equal = profit({ invest: 20000, payoutMedals: 1500, exchangeRate: 20 })
    const rate56 = profit({ invest: 20000, payoutMedals: 1500, exchangeRate: 100 / 5.6 })
    expect(rate56).toBeLessThan(equal)
  })
})

describe('workedHours / hourlyRate', () => {
  const start = '2026-08-11T10:00:00.000Z'

  it('終了済みなら開始から終了までの時間', () => {
    expect(workedHours(start, '2026-08-11T13:30:00.000Z')).toBeCloseTo(3.5)
  })

  it('実戦中なら現在時刻まで', () => {
    const now = new Date('2026-08-11T12:00:00.000Z')
    expect(workedHours(start, null, now)).toBeCloseTo(2)
  })

  it('時給は収支を実働時間で割った値', () => {
    const rate = hourlyRate({
      invest: 20000,
      payoutMedals: 1500,
      exchangeRate: 20,
      startedAt: start,
      endedAt: '2026-08-11T14:00:00.000Z',
    })
    // 収支10,000円 ÷ 4時間
    expect(rate).toBe(2500)
  })

  it('実働時間が0なら時給は null(0除算を避ける)', () => {
    const rate = hourlyRate({
      invest: 0,
      payoutMedals: 0,
      exchangeRate: 20,
      startedAt: start,
      endedAt: start,
    })
    expect(rate).toBeNull()
  })
})

describe('myProbabilities', () => {
  it('自分の実績から各確率の分母を出す', () => {
    const probs = myProbabilities({ games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 5, cherryRb: 3 })
    expect(probs.bb).toBe(250)
    expect(probs.rb).toBe(375)
    expect(probs.total).toBe(150)
    expect(probs.grape).toBe(6)
    expect(probs.soloRb).toBe(600)
  })

  it('カウントしていない指標は null になる(0回と未計測を区別できる)', () => {
    const probs = myProbabilities({ games: 3000, bb: 12, rb: 8, grape: 0, soloRb: 0, cherryRb: 0 })
    expect(probs.grape).toBeNull()
    expect(probs.soloRb).toBeNull()
  })
})

describe('settingPosition', () => {
  // マイジャグラーVの合算: 設定1 = 1/163.8、設定6 = 1/114.6
  const s1 = 163.8
  const s6 = 114.6

  it('設定1の理論値ちょうどなら0', () => {
    expect(settingPosition(163.8, s1, s6)).toBeCloseTo(0)
  })

  it('設定6の理論値ちょうどなら1', () => {
    expect(settingPosition(114.6, s1, s6)).toBeCloseTo(1)
  })

  it('分母が小さいほど高設定側に寄る', () => {
    const worse = settingPosition(150, s1, s6)!
    const better = settingPosition(125, s1, s6)!
    expect(better).toBeGreaterThan(worse)
  })

  it('設定1より悪くても0で止まる(メーターが枠外に出ない)', () => {
    expect(settingPosition(250, s1, s6)).toBe(0)
  })

  it('設定6より良くても1で止まる', () => {
    expect(settingPosition(90, s1, s6)).toBe(1)
  })

  it('観測値が無ければ null', () => {
    expect(settingPosition(null, s1, s6)).toBeNull()
  })

  it('設定差が無い指標では null(0除算を避ける)', () => {
    expect(settingPosition(6.02, 6.02, 6.02)).toBeNull()
  })
})

describe('normalGames', () => {
  const count: MyCount = { games: 5000, bb: 20, rb: 15, grape: 800, soloRb: 8, cherryRb: 7 }

  /** 平均消化G数が判明している機種を模した最小限のマスタ */
  function machineWithBonusGames(big: number, reg: number): MachineSpec {
    const base = findMachine('my-juggler-v')!
    return { ...base, bonusGames: { big, reg } }
  }

  it('ボーナス消化ぶんを差し引いた通常時G数を返す', () => {
    // BB20回×30G + RB15回×12G = 780G
    const result = normalGames(count, machineWithBonusGames(30, 12))
    expect(result.games).toBe(4220)
    expect(result.corrected).toBe(true)
  })

  it('補正するとぶどう確率は良い方向に動く', () => {
    // 分母が減るので 1/x の x が小さくなる = 高設定寄りに見える
    const corrected = normalGames(count, machineWithBonusGames(30, 12)).games / count.grape
    const uncorrected = count.games / count.grape
    expect(corrected).toBeLessThan(uncorrected)
  })

  it('平均消化G数が未確定の機種では補正せず、その旨を返す', () => {
    const unknown: MachineSpec = { ...findMachine('my-juggler-v')!, bonusGames: null }
    const result = normalGames(count, unknown)
    expect(result.games).toBe(5000)
    expect(result.corrected).toBe(false)
  })

  it('マイジャグラーV(BIG20G / REG8G)の実データで補正できる', () => {
    // BB20回×20G + RB15回×8G = 520G
    const result = normalGames(count, findMachine('my-juggler-v')!)
    expect(result.games).toBe(4480)
    expect(result.corrected).toBe(true)
  })

  it('アイム系はBIGが21Gなので補正量が大きい', () => {
    const my = normalGames(count, findMachine('my-juggler-v')!).games
    const im = normalGames(count, findMachine('im-juggler-ex')!).games
    // BIG20回ぶんで20G多く引かれる
    expect(my - im).toBe(20)
  })

  it('ボーナスばかりで通常時が負になっても0で止まる', () => {
    const heavy: MyCount = { ...count, games: 100 }
    expect(normalGames(heavy, machineWithBonusGames(30, 12)).games).toBe(0)
  })
})
