/**
 * 実戦記録のCSV入出力
 *
 * ブラウザのデータは消える可能性があるため、これが唯一のバックアップ手段になる。
 * 端末を変えるときの移行手段も兼ねる。
 *
 * Excelで開けるよう、書き出し時はBOM付きUTF-8にする。
 */
import type { Session } from '../types'

/** 列の定義。読み書きで同じ定義を使い、順序のずれを起こさない */
const COLUMNS = [
  'id',
  '日付',
  '店名',
  '台番号',
  '機種ID',
  '開始G数',
  '開始BB',
  '開始RB',
  '開始差枚',
  '終了G数',
  '終了BB',
  '終了RB',
  '終了差枚',
  '自分のG数',
  '自分のBB',
  '自分のREG',
  'ぶどう',
  '単独REG',
  'チェリーREG',
  '投資',
  '回収枚数',
  '交換率',
  '開始時刻',
  '終了時刻',
  'メモ',
  '状態',
] as const

function escapeCell(value: string | number | null): string {
  if (value === null) return ''
  const text = String(value)
  // カンマ・引用符・改行を含む値は引用符で囲み、内部の引用符は2重にする
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** セッションをCSV文字列に変換する(BOM付き) */
export function sessionsToCsv(sessions: Session[]): string {
  const rows = sessions.map((s) =>
    [
      s.id,
      s.date,
      s.hall,
      s.machineNo,
      s.machineTypeId,
      s.start.games,
      s.start.bb,
      s.start.rb,
      s.start.medals,
      s.end?.games ?? null,
      s.end?.bb ?? null,
      s.end?.rb ?? null,
      s.end?.medals ?? null,
      s.myCount.games,
      s.myCount.bb,
      s.myCount.rb,
      s.myCount.grape,
      s.myCount.soloRb,
      s.myCount.cherryRb,
      s.invest,
      s.payoutMedals,
      s.exchangeRate,
      s.startedAt,
      s.endedAt,
      s.memo,
      s.status,
    ].map(escapeCell).join(','),
  )
  return '﻿' + [COLUMNS.join(','), ...rows].join('\r\n')
}

/** 1行をセルに分解する。引用符で囲まれたカンマ・改行を正しく扱う */
function parseLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

/** CSV全体を行に分割する。引用符の内側の改行では区切らない */
function splitRows(text: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      rows.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current !== '') rows.push(current)
  return rows.filter((r) => r.trim() !== '')
}

function toNumber(value: string, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export interface ImportResult {
  sessions: Session[]
  /** 読み飛ばした行の説明。何が落ちたかを利用者に伝える */
  errors: string[]
}

/**
 * CSVからセッションを復元する。
 * 壊れた行があっても全体を捨てず、読める行だけ取り込んで残りを報告する。
 */
export function csvToSessions(text: string): ImportResult {
  const withoutBom = text.replace(/^﻿/, '')
  const rows = splitRows(withoutBom)
  const errors: string[] = []

  if (rows.length === 0) return { sessions: [], errors: ['ファイルが空です'] }

  const header = parseLine(rows[0])
  if (header[0] !== COLUMNS[0] || header.length !== COLUMNS.length) {
    return {
      sessions: [],
      errors: [
        `見出し行がこのアプリの形式と一致しません(${header.length}列、期待は${COLUMNS.length}列)`,
      ],
    }
  }

  const sessions: Session[] = []
  for (let i = 1; i < rows.length; i++) {
    const cells = parseLine(rows[i])
    if (cells.length !== COLUMNS.length) {
      errors.push(`${i + 1}行目: 列数が合いません(${cells.length}列)`)
      continue
    }
    const [
      id, date, hall, machineNo, machineTypeId,
      startGames, startBb, startRb, startMedals,
      endGames, endBb, endRb, endMedals,
      myGames, myBb, myRb, grape, soloRb, cherryRb,
      invest, payoutMedals, exchangeRate,
      startedAt, endedAt, memo, status,
    ] = cells

    if (!id.trim()) {
      errors.push(`${i + 1}行目: idが空です`)
      continue
    }

    // 終了時カウンターは、G数が空なら「未入力」として扱う
    const hasEnd = endGames.trim() !== ''

    sessions.push({
      id,
      date,
      hall,
      machineNo,
      machineTypeId,
      start: {
        games: toNumber(startGames),
        bb: toNumber(startBb),
        rb: toNumber(startRb),
        medals: toNullableNumber(startMedals),
      },
      end: hasEnd
        ? {
            games: toNumber(endGames),
            bb: toNumber(endBb),
            rb: toNumber(endRb),
            medals: toNullableNumber(endMedals),
          }
        : null,
      myCount: {
        games: toNumber(myGames),
        bb: toNumber(myBb),
        rb: toNumber(myRb),
        grape: toNumber(grape),
        soloRb: toNumber(soloRb),
        cherryRb: toNumber(cherryRb),
      },
      invest: toNumber(invest),
      payoutMedals: toNumber(payoutMedals),
      exchangeRate: toNumber(exchangeRate, 20),
      startedAt: startedAt || new Date().toISOString(),
      endedAt: endedAt.trim() === '' ? null : endedAt,
      memo,
      status: status === 'active' ? 'active' : 'finished',
    })
  }

  return { sessions, errors }
}

/** 書き出し用のファイル名。日付が入っていないと世代管理できない */
export function csvFileName(date: string): string {
  return `juggler-log-${date}.csv`
}
