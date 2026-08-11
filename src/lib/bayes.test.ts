import { describe, expect, it } from 'vitest'
import { checkGrapeSensitivity, estimateSetting } from './bayes'
import { findMachine } from '../data/machines'
import type { MyCount } from '../types'

const myJuggler = findMachine('my-juggler-v')!
const imJuggler = findMachine('im-juggler-ex')!

function count(patch: Partial<MyCount> = {}): MyCount {
  return { games: 0, bb: 0, rb: 0, grape: 0, soloRb: 0, cherryRb: 0, ...patch }
}

/** マイジャグラーVを1万G打ち、設定6の理論値どおりに当たった場合 */
function likeSetting6(): MyCount {
  // 設定6: BB 1/229.1・RB 1/229.1 → 1万Gで各約44回
  // 通常時G数 = 10000 -(44×20 + 44×8) = 8768、ぶどう 1/5.69 → 約1541回
  return count({ games: 10000, bb: 44, rb: 44, grape: 1541, soloRb: 30, cherryRb: 14 })
}

/** 同じく設定1の理論値どおりに当たった場合 */
function likeSetting1(): MyCount {
  // 設定1: BB 1/273.1 → 約37回、RB 1/409.6 → 約24回
  // 通常時G数 = 10000 -(37×20 + 24×8) = 9068、ぶどう 1/5.90 → 約1537回
  return count({ games: 10000, bb: 37, rb: 24, grape: 1537, soloRb: 15, cherryRb: 9 })
}

describe('事後分布の性質', () => {
  it('確率の合計は1になる', () => {
    const total = estimateSetting(myJuggler, likeSetting6()).posterior.reduce(
      (sum, p) => sum + p.probability,
      0,
    )
    expect(total).toBeCloseTo(1)
  })

  it('設定1〜6の6件を返す', () => {
    expect(estimateSetting(myJuggler, likeSetting6()).posterior.map((p) => p.setting)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
  })

  it('まだ何も観測していなければ一様分布のまま', () => {
    const result = estimateSetting(myJuggler, count())
    for (const p of result.posterior) {
      expect(p.probability).toBeCloseTo(1 / 6)
    }
    expect(result.weak).toBe(true)
    expect(result.expectedSetting).toBeCloseTo(3.5)
  })
})

describe('理論値どおりの実戦データを与えたとき', () => {
  it('設定6相当のデータなら設定6が最有力になる', () => {
    const result = estimateSetting(myJuggler, likeSetting6())
    expect(result.mostLikely).toBe(6)
    expect(result.highProbability).toBeGreaterThan(result.lowProbability)
    expect(result.expectedSetting).toBeGreaterThan(4.5)
  })

  it('設定1相当のデータなら低設定側に寄る', () => {
    const result = estimateSetting(myJuggler, likeSetting1())
    expect(result.lowProbability).toBeGreaterThan(result.highProbability)
    expect(result.expectedSetting).toBeLessThan(2.5)
  })

  it('1万Gも回していれば「材料が乏しい」とは判定しない', () => {
    expect(estimateSetting(myJuggler, likeSetting6()).weak).toBe(false)
  })

  it.each([
    // 設定6の理論値どおりに当たり続けても、序盤は事前分布からほとんど動かない
    [300, 1, 1, 49],
    [1000, 4, 4, 156],
  ])('%iGでは「材料が乏しい」と伝える', (games, bb, rb, grape) => {
    const result = estimateSetting(myJuggler, count({ games, bb, rb, grape }))
    expect(result.weak).toBe(true)
  })

  it('2000Gを超えれば材料が乏しいとは言わなくなる', () => {
    const result = estimateSetting(myJuggler, count({ games: 3000, bb: 13, rb: 13, grape: 475 }))
    expect(result.weak).toBe(false)
  })
})

describe('ぶどうで設定1〜5を区別できない機種の扱い', () => {
  // アイムジャグラーEXは設定1〜5のぶどうが同値(1/6.02)で、設定6のみ優遇される。
  // ぶどうを何回数えても、設定1〜5の間の比率は動いてはいけない。
  const base = count({ games: 8000, bb: 30, rb: 25, grape: 1200 })

  it('ぶどうの回数を変えても設定1と設定2の比率は変わらない', () => {
    const few = estimateSetting(imJuggler, { ...base, grape: 1150 }).posterior
    const many = estimateSetting(imJuggler, { ...base, grape: 1300 }).posterior

    const ratio = (p: typeof few) => p[0].probability / p[1].probability
    expect(ratio(few)).toBeCloseTo(ratio(many), 6)
  })

  it('ぶどうが良ければ設定6の確率は上がる', () => {
    const few = estimateSetting(imJuggler, { ...base, grape: 1150 })
    const many = estimateSetting(imJuggler, { ...base, grape: 1300 })
    expect(many.posterior[5].probability).toBeGreaterThan(few.posterior[5].probability)
  })
})

describe('単独REGの扱い', () => {
  it('契機を分類できなかったREGは母数から除く', () => {
    // どちらも「分類できたREG10回のうち7回が単独」。
    // 後者はさらに10回、契機不明のREGがある
    const classified = count({ games: 6000, bb: 20, rb: 10, soloRb: 7, cherryRb: 3 })
    const withUnknown = count({ games: 6000, bb: 20, rb: 20, soloRb: 7, cherryRb: 3 })

    const soloOf = (c: MyCount) =>
      estimateSetting(myJuggler, c).contributions.find((x) => x.key === 'soloRb')!

    expect(soloOf(classified).observed).toEqual({ count: 7, trials: 10 })
    expect(soloOf(withUnknown).observed).toEqual({ count: 7, trials: 10 })
    // 不明ぶんに引きずられず、単独REGから得られる結論は同じになる
    expect(soloOf(withUnknown).expectedSetting).toBeCloseTo(
      soloOf(classified).expectedSetting!,
      6,
    )
  })

  it('一度も分類していなければ判断材料にしない', () => {
    const result = estimateSetting(myJuggler, count({ games: 6000, bb: 20, rb: 10 }))
    const solo = result.contributions.find((x) => x.key === 'soloRb')!
    expect(solo.usable).toBe(false)
    expect(solo.reason).toContain('分類していない')
  })

  it('解析値が無い機種では単独REGを使わない', () => {
    const happy = findMachine('happy-juggler-v3')!
    const solo = estimateSetting(happy, count({ games: 6000, bb: 20, rb: 10, soloRb: 6, cherryRb: 4 }))
      .contributions.find((x) => x.key === 'soloRb')!

    expect(solo.usable).toBe(false)
    expect(solo.reason).toContain('解析値が無い')
  })

  it('単独REGの割合が高いほど高設定側に寄る', () => {
    // マイジャグラーVは REGのうち単独である割合が 設定1で約63%、設定6で約69%
    const low = count({ games: 6000, bb: 20, rb: 16, soloRb: 8, cherryRb: 8 })
    const high = count({ games: 6000, bb: 20, rb: 16, soloRb: 14, cherryRb: 2 })

    expect(estimateSetting(myJuggler, high).expectedSetting).toBeGreaterThan(
      estimateSetting(myJuggler, low).expectedSetting,
    )
  })
})

describe('入力ミスへの耐性', () => {
  it('ボーナス回数がG数を超えていても落ちない', () => {
    const result = estimateSetting(myJuggler, count({ games: 10, bb: 50, rb: 50 }))
    expect(result.posterior).toHaveLength(6)
    const bonus = result.contributions.find((x) => x.key === 'bonus')!
    expect(bonus.usable).toBe(false)
  })

  it('判断材料がひとつも無ければ一様分布を返す', () => {
    const result = estimateSetting(myJuggler, count({ games: 0, bb: 5, rb: 5 }))
    expect(result.posterior.every((p) => Math.abs(p.probability - 1 / 6) < 1e-9)).toBe(true)
  })
})

describe('指標ごとの寄与', () => {
  it('使えた指標には期待設定が入る', () => {
    const result = estimateSetting(myJuggler, likeSetting6())
    const bonus = result.contributions.find((x) => x.key === 'bonus')!

    expect(bonus.usable).toBe(true)
    expect(bonus.observed).toEqual({ count: 88, trials: 10000 })
    expect(bonus.expectedSetting).toBeGreaterThan(4)
  })

  it('ぶどうの母数は通常時G数になる(総G数ではない)', () => {
    const result = estimateSetting(myJuggler, likeSetting6())
    const grape = result.contributions.find((x) => x.key === 'grape')!
    // 10000 -(BB44×20G + REG44×8G) = 8768
    expect(grape.observed).toEqual({ count: 1541, trials: 8768 })
  })
})

describe('ぶどう解析値の感度分析', () => {
  it('対立する解析値がある機種では比較できる', () => {
    // マイジャグラーVは設定6のぶどうが 1/5.69 と 1/5.66 で割れている
    const result = checkGrapeSensitivity(myJuggler, likeSetting6())
    expect(result.available).toBe(true)
    expect(result.altExpectedSetting).not.toBeNull()
  })

  it('対立値が無い機種では比較しない', () => {
    const result = checkGrapeSensitivity(imJuggler, likeSetting6())
    expect(result.available).toBe(false)
    expect(result.flipped).toBe(false)
  })

  it('理論値どおりのデータなら、どちらの解析値でも結論は変わらない', () => {
    expect(checkGrapeSensitivity(myJuggler, likeSetting6()).flipped).toBe(false)
  })
})
