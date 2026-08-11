import { describe, expect, it } from 'vitest'
import { csvToSessions, sessionsToCsv } from './csv'
import type { Session } from '../types'

const sample: Session = {
  id: 'abc-123',
  date: '2026-08-11',
  hall: '〇〇会館',
  machineNo: '123',
  machineTypeId: 'my-juggler-v',
  start: { games: 12000, bb: 40, rb: 30, medals: 1500 },
  end: { games: 15000, bb: 52, rb: 38, medals: 2400 },
  myCount: { games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 5, cherryRb: 3 },
  invest: 20000,
  payoutMedals: 1500,
  exchangeRate: 20,
  startedAt: '2026-08-11T01:00:00.000Z',
  endedAt: '2026-08-11T05:00:00.000Z',
  memo: '朝から',
  status: 'finished',
}

describe('CSVの往復', () => {
  it('書き出して読み込むと元に戻る', () => {
    const { sessions, errors } = csvToSessions(sessionsToCsv([sample]))
    expect(errors).toEqual([])
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toEqual(sample)
  })

  it('実戦中(終了カウンター未入力)のまま往復できる', () => {
    const active: Session = { ...sample, end: null, endedAt: null, status: 'active' }
    const { sessions } = csvToSessions(sessionsToCsv([active]))
    expect(sessions[0].end).toBeNull()
    expect(sessions[0].endedAt).toBeNull()
    expect(sessions[0].status).toBe('active')
  })

  it('差枚が未取得(null)でも往復できる', () => {
    const noMedals: Session = {
      ...sample,
      start: { ...sample.start, medals: null },
      end: { ...sample.end!, medals: null },
    }
    const { sessions } = csvToSessions(sessionsToCsv([noMedals]))
    expect(sessions[0].start.medals).toBeNull()
    expect(sessions[0].end?.medals).toBeNull()
  })

  it('カンマ・引用符・改行を含むメモが壊れない', () => {
    const tricky: Session = {
      ...sample,
      hall: 'A店, B館',
      memo: '「高設定っぽい」\n合算1/120で\t粘った',
    }
    const { sessions, errors } = csvToSessions(sessionsToCsv([tricky]))
    expect(errors).toEqual([])
    expect(sessions[0].hall).toBe('A店, B館')
    expect(sessions[0].memo).toBe(tricky.memo)
  })

  it('Excel対策のBOMが先頭に付く', () => {
    expect(sessionsToCsv([sample]).charCodeAt(0)).toBe(0xfeff)
  })
})

describe('CSVの読み込み', () => {
  it('見出しが違うファイルは取り込まない', () => {
    const { sessions, errors } = csvToSessions('名前,住所\n山田,東京')
    expect(sessions).toHaveLength(0)
    expect(errors[0]).toContain('見出し行')
  })

  it('空ファイルはその旨を返す', () => {
    expect(csvToSessions('').errors[0]).toContain('空')
  })

  it('壊れた行があっても、読める行は取り込む', () => {
    const csv = sessionsToCsv([sample, { ...sample, id: 'def-456' }])
    const rows = csv.split('\r\n')
    // 2件目を列数の足りない行に差し替える
    rows[2] = 'def-456,2026-08-11,壊れた行'
    const { sessions, errors } = csvToSessions(rows.join('\r\n'))

    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('abc-123')
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('列数')
  })

  it('idが空の行は取り込まない(上書き先が定まらないため)', () => {
    const rows = sessionsToCsv([sample]).split('\r\n')
    rows[1] = rows[1].replace(/^abc-123/, '')
    const { sessions, errors } = csvToSessions(rows.join('\r\n'))
    expect(sessions).toHaveLength(0)
    expect(errors[0]).toContain('id')
  })

  it('交換率が壊れていても等価で復元する(記録を捨てない)', () => {
    const rows = sessionsToCsv([sample]).split('\r\n')
    rows[1] = rows[1].replace(',20,2026-08-11T01', ',こわれた,2026-08-11T01')
    const { sessions } = csvToSessions(rows.join('\r\n'))
    expect(sessions[0].exchangeRate).toBe(20)
  })
})
