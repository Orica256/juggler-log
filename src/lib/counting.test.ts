import { describe, expect, it } from 'vitest'
import { applyCount, canRevert, revertCount, type CountAction } from './counting'
import type { MyCount } from '../types'

const base: MyCount = { games: 1000, bb: 3, rb: 2, grape: 170, soloRb: 1, cherryRb: 1 }

describe('applyCount', () => {
  it('ぶどうを1加算する', () => {
    expect(applyCount(base, 'grape').grape).toBe(171)
  })

  it('BBを1加算する', () => {
    expect(applyCount(base, 'bb').bb).toBe(4)
  })

  it('単独REGはREG合計と単独REGの両方を増やす', () => {
    const next = applyCount(base, 'soloRb')
    expect(next.rb).toBe(3)
    expect(next.soloRb).toBe(2)
  })

  it('チェリーREGはREG合計とチェリーREGを増やす', () => {
    const next = applyCount(base, 'cherryRb')
    expect(next.rb).toBe(3)
    expect(next.cherryRb).toBe(2)
    expect(next.soloRb).toBe(1)
  })

  it('不明REGはREG合計だけを増やす(単独にもチェリーにも寄せない)', () => {
    const next = applyCount(base, 'unknownRb')
    expect(next.rb).toBe(3)
    expect(next.soloRb).toBe(1)
    expect(next.cherryRb).toBe(1)
  })

  it('G数は勝手に変えない(台のカウンターから入力するため)', () => {
    expect(applyCount(base, 'grape').games).toBe(1000)
  })

  it('元のオブジェクトを書き換えない', () => {
    applyCount(base, 'grape')
    expect(base.grape).toBe(170)
  })
})

describe('revertCount', () => {
  const actions: CountAction[] = ['grape', 'bb', 'soloRb', 'cherryRb', 'unknownRb']

  it.each(actions)('%s は加算してから取り消すと元に戻る', (action) => {
    expect(revertCount(applyCount(base, action), action)).toEqual(base)
  })

  it('0未満にはならない', () => {
    const empty: MyCount = { games: 0, bb: 0, rb: 0, grape: 0, soloRb: 0, cherryRb: 0 }
    expect(revertCount(empty, 'grape')).toEqual(empty)
    expect(revertCount(empty, 'soloRb')).toEqual(empty)
  })

  it('単独REGの取り消しはREG合計も戻す', () => {
    const next = revertCount(base, 'soloRb')
    expect(next.rb).toBe(1)
    expect(next.soloRb).toBe(0)
  })
})

describe('canRevert', () => {
  const empty: MyCount = { games: 0, bb: 0, rb: 0, grape: 0, soloRb: 0, cherryRb: 0 }

  it('値が0なら取り消せない(空振りを画面に伝えるため)', () => {
    expect(canRevert(empty, 'grape')).toBe(false)
    expect(canRevert(empty, 'unknownRb')).toBe(false)
  })

  it('値があれば取り消せる', () => {
    expect(canRevert(base, 'grape')).toBe(true)
    expect(canRevert(base, 'soloRb')).toBe(true)
  })

  it('手動修正でREG合計だけ0にされた場合、単独REGの取り消しはできない', () => {
    const broken: MyCount = { ...base, rb: 0 }
    expect(canRevert(broken, 'soloRb')).toBe(false)
  })
})
