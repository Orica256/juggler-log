/**
 * 実戦中のカウント操作
 *
 * 押し間違いは必ず起きるので、すべての操作は1手で取り消せるようにする。
 * そのため「加算」と「取り消し」を対になる純関数として定義し、
 * 画面側は操作履歴を積んでおけば戻せる作りにする。
 */
import type { MyCount } from '../types'

export type CountAction =
  /** ぶどう */
  | 'grape'
  /** BIGボーナス */
  | 'bb'
  /** 単独REG(チェリー重複ではないREG) */
  | 'soloRb'
  /** チェリー重複REG */
  | 'cherryRb'
  /**
   * 分類できなかったREG。
   * チェリーを狙っていなかった等で単独かどうか判断できなかった場合に使う。
   * 推測でどちらかに寄せると設定推測が狂うため、必ず逃げ道を用意する。
   */
  | 'unknownRb'

export const COUNT_LABELS: Record<CountAction, string> = {
  grape: 'ぶどう',
  bb: 'BB',
  soloRb: '単独REG',
  cherryRb: 'チェリーREG',
  unknownRb: '不明REG',
}

/**
 * カウントを1回加算する。
 * 単独REG・チェリーREG はどちらもREG回数に含まれる点に注意。
 * (REG総数は台のデータカウンターとも突き合わせられる)
 */
export function applyCount(count: MyCount, action: CountAction): MyCount {
  switch (action) {
    case 'grape':
      return { ...count, grape: count.grape + 1 }
    case 'bb':
      return { ...count, bb: count.bb + 1 }
    case 'soloRb':
      return { ...count, rb: count.rb + 1, soloRb: count.soloRb + 1 }
    case 'cherryRb':
      return { ...count, rb: count.rb + 1, cherryRb: count.cherryRb + 1 }
    case 'unknownRb':
      return { ...count, rb: count.rb + 1 }
  }
}

/** 加算を取り消す。0未満にはしない */
export function revertCount(count: MyCount, action: CountAction): MyCount {
  const dec = (n: number) => Math.max(0, n - 1)
  switch (action) {
    case 'grape':
      return { ...count, grape: dec(count.grape) }
    case 'bb':
      return { ...count, bb: dec(count.bb) }
    case 'soloRb':
      return { ...count, rb: dec(count.rb), soloRb: dec(count.soloRb) }
    case 'cherryRb':
      return { ...count, rb: dec(count.rb), cherryRb: dec(count.cherryRb) }
    case 'unknownRb':
      return { ...count, rb: dec(count.rb) }
  }
}

/** その操作が実際に値を減らせるか(0のときの取り消しは空振りになる) */
export function canRevert(count: MyCount, action: CountAction): boolean {
  switch (action) {
    case 'grape':
      return count.grape > 0
    case 'bb':
      return count.bb > 0
    case 'soloRb':
      return count.rb > 0 && count.soloRb > 0
    case 'cherryRb':
      return count.rb > 0 && count.cherryRb > 0
    case 'unknownRb':
      return count.rb > 0
  }
}

/**
 * 押した感触を返す。
 * ただし iOS Safari は Vibration API を実装していないため、これだけに頼ってはいけない。
 * 画面側でボタン面に現在値を出すなど、視覚的なフィードバックを必ず併用すること。
 */
export function buzz(durationMs = 12): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(durationMs)
  }
}
