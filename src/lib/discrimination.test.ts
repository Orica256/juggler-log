import { describe, expect, it } from 'vitest'
import { MACHINES, findMachine } from '../data/machines'
import { grapeDiffType, grapeGroups, indicatorScores, recommendedManualCount } from './discrimination'
import type { MachineSpec } from '../types'

/** テスト対象の機種を必ず取得する(取れなければマスタ生成が壊れている) */
function machine(id: string): MachineSpec {
  const m = findMachine(id)
  expect(m, `機種マスタに ${id} が存在しない`).toBeDefined()
  return m!
}

describe('機種マスタの健全性', () => {
  it('9機種が登録されている', () => {
    expect(MACHINES).toHaveLength(9)
  })

  it.each(MACHINES.map((m) => [m.name, m] as const))('%s: 設定1〜6が揃っている', (_name, m) => {
    expect(m.settings.map((s) => s.setting)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: 出玉率が設定1から6へ単調増加する',
    (_name, m) => {
      const rates = m.settings.map((s) => s.payoutRate)
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i], `設定${i + 1}の出玉率が設定${i}以下`).toBeGreaterThan(rates[i - 1])
      }
    },
  )

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: 合算確率が設定1から6へ軽くなる(分母が単調減少)',
    (_name, m) => {
      const totals = m.settings.map((s) => s.totalProb)
      for (let i = 1; i < totals.length; i++) {
        expect(totals[i]).toBeLessThan(totals[i - 1])
      }
    },
  )

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: ぶどう確率が高設定ほど悪化していない(分母が非増加)',
    (_name, m) => {
      const grapes = m.settings.map((s) => s.grapeProb)
      for (let i = 1; i < grapes.length; i++) {
        expect(grapes[i]).toBeLessThanOrEqual(grapes[i - 1])
      }
    },
  )

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: 単独REGは全設定揃っているか全設定nullのどちらか',
    (_name, m) => {
      const filled = m.settings.filter((s) => s.soloRbProb !== null).length
      expect([0, 6], '一部の設定だけ埋まっていると尤度が偏る').toContain(filled)
    },
  )

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: ボーナス平均消化G数から算出した純増が公表値と一致する',
    (_name, m) => {
      // 6号機はボーナス中のみ2枚掛けで、ぶどうが毎ゲーム14枚払い出される。
      // 純増 = 消化G数 ×(14 - 2)。公表値は BIG 240枚(アイム系252枚)/ REG 96枚
      expect(m.bonusGames, '平均消化G数が未設定').not.toBeNull()
      const { big, reg } = m.bonusGames!
      expect(reg * 12).toBe(96)
      expect([240, 252]).toContain(big * 12)
    },
  )

  it.each(MACHINES.map((m) => [m.name, m] as const))(
    '%s: 合算が BB と RB から算出した値と整合する(誤差1%%以内)',
    (_name, m) => {
      for (const s of m.settings) {
        const expected = 1 / (1 / s.bbProb + 1 / s.rbProb)
        expect(Math.abs(expected - s.totalProb) / s.totalProb).toBeLessThan(0.01)
      }
    },
  )
})

describe('ぶどうの設定差構造の自動判定', () => {
  it('ゴーゴージャグラー3 は全設定が別値なので graded', () => {
    expect(grapeDiffType(machine('gogo-juggler-3'))).toBe('graded')
  })

  it('アイムジャグラーEX は設定1〜5が同値なので partial', () => {
    const m = machine('im-juggler-ex')
    expect(grapeDiffType(m)).toBe('partial')
    // 良い順に並ぶので、先頭が設定6・次が設定1〜5のかたまりになる
    expect(grapeGroups(m)).toEqual([[6], [1, 2, 3, 4, 5]])
  })

  it('ウルトラミラクルジャグラー は設定1〜4が同値', () => {
    const m = machine('ultra-miracle-juggler')
    expect(grapeDiffType(m)).toBe('partial')
    expect(grapeGroups(m)).toEqual([[6], [5], [1, 2, 3, 4]])
  })

  it('ジャグラーガールズSS は設定1〜4が同値', () => {
    expect(grapeGroups(machine('juggler-girls-ss'))).toEqual([[6], [5], [1, 2, 3, 4]])
  })
})

describe('1Gあたりの情報量', () => {
  it('設定差が無い指標の情報量は0になる', () => {
    // アイムジャグラーEXのぶどうは設定1〜5が同値。全ペア平均なのでゼロにはならないが、
    // 設定差が全設定にわたって付いている機種より必ず小さくなる
    const im = indicatorScores(machine('im-juggler-ex')).find((s) => s.key === 'grape')!
    const gogo = indicatorScores(machine('gogo-juggler-3')).find((s) => s.key === 'grape')!
    expect(im.information!).toBeLessThan(gogo.information!)
  })

  it('数値が1つでも欠けている指標は null になる', () => {
    // ハッピージャグラーVⅢ は単独REGの解析値が無い
    const solo = indicatorScores(machine('happy-juggler-v3')).find((s) => s.key === 'soloRb')!
    expect(solo.information).toBeNull()
  })

  it('情報量の高い順に並ぶ', () => {
    const scores = indicatorScores(machine('my-juggler-v'))
    const values = scores.map((s) => s.information).filter((v): v is number => v !== null)
    expect([...values].sort((a, b) => b - a)).toEqual(values)
  })
})

describe('手カウントすべき指標の推奨', () => {
  // データカウンターから自動で得られる REG / 合算 は対象外。
  // 調査時に各解析サイトが述べていた見解と一致するかを検証する。

  it('マイジャグラーV は単独REG(解析サイトの見解: 単独REG > ぶどう)', () => {
    const advice = recommendedManualCount(machine('my-juggler-v'))
    expect(advice.key).toBe('soloRb')
    expect(advice.ratio!).toBeGreaterThan(2)
  })

  it('ゴーゴージャグラー3 はぶどう(解析サイトの見解: ぶどうが主指標として機能する)', () => {
    expect(recommendedManualCount(machine('gogo-juggler-3')).key).toBe('grape')
  })

  it('ウルトラミラクルジャグラー は単独REG(ぶどうは設定1〜4が同値のため)', () => {
    const advice = recommendedManualCount(machine('ultra-miracle-juggler'))
    expect(advice.key).toBe('soloRb')
    expect(advice.reason).toContain('設定1・2・3・4 が同値')
  })

  it('アイムジャグラーEX は単独REG。ぶどうを勧めてはいけない', () => {
    const advice = recommendedManualCount(machine('im-juggler-ex'))
    expect(advice.key).toBe('soloRb')
    expect(advice.reason).toContain('設定1・2・3・4・5 が同値')
  })

  it('ネオアイムジャグラーEX も先代と同じ結論になる', () => {
    expect(recommendedManualCount(machine('neo-im-juggler-ex')).key).toBe('soloRb')
  })

  it('ジャグラーガールズSS は単独REG(ぶどうの設定差が小さいため)', () => {
    expect(recommendedManualCount(machine('juggler-girls-ss')).key).toBe('soloRb')
  })

  it.each([
    ['happy-juggler-v3', 'ハッピージャグラーVⅢ'],
    ['mr-juggler', 'ミスタージャグラー'],
  ])('%s は単独REGの解析値が無いためぶどうにフォールバックする', (id) => {
    const advice = recommendedManualCount(machine(id))
    expect(advice.key).toBe('grape')
    expect(advice.reason).toContain('単独REGの信頼できる解析値が無い')
  })
})
