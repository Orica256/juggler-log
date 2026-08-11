/**
 * セッション(実戦記録)の読み書き
 *
 * 入力途中で画面を閉じても内容が消えないようにするため、
 * 「保存ボタンを押したら書き込む」のではなく、入力のたびに即座にDBへ書き込む。
 * そのため新規実戦は、フォームを開いた時点で空のレコードを作ってしまう。
 */
import { applyCount, canRevert, revertCount, type CountAction } from '../lib/counting'
import { today } from '../lib/format'
import type { CounterSnapshot, MyCount, Session } from '../types'
import { db, getSettings } from './index'

const EMPTY_COUNTER: CounterSnapshot = { games: 0, bb: 0, rb: 0, medals: null }
const EMPTY_MY_COUNT: MyCount = { games: 0, bb: 0, rb: 0, grape: 0, soloRb: 0, cherryRb: 0 }

function newId(): string {
  return crypto.randomUUID()
}

/** 実戦中のセッションを取得する(無ければ undefined) */
export async function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where('status').equals('active').first()
}

/** セッションを1件取得する */
export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id)
}

/** 新しい実戦を開始する。既定値はアプリ設定から引き継ぐ */
export async function startSession(): Promise<Session> {
  const settings = await getSettings()
  const now = new Date().toISOString()
  const session: Session = {
    id: newId(),
    date: today(),
    hall: settings.defaultHall,
    machineNo: '',
    machineTypeId: settings.defaultMachineTypeId ?? '',
    start: { ...EMPTY_COUNTER },
    end: null,
    myCount: { ...EMPTY_MY_COUNT },
    invest: 0,
    payoutMedals: 0,
    exchangeRate: settings.defaultExchangeRate,
    startedAt: now,
    endedAt: null,
    memo: '',
    status: 'active',
  }
  await db.sessions.put(session)
  return session
}

/** セッションを部分更新する */
export async function updateSession(
  id: string,
  patch: Partial<Omit<Session, 'id'>>,
): Promise<void> {
  await db.sessions.update(id, patch)
}

/**
 * カウントを1回加算する。
 *
 * ぶどうは1000Gあたり約170回押されるため、
 * 「画面が持っている値に+1して書き戻す」方式では連打時に取りこぼす。
 * トランザクション内で読み書きして、確実に積み上がるようにする。
 */
export async function incrementCount(id: string, action: CountAction): Promise<void> {
  await db.sessions
    .where('id')
    .equals(id)
    .modify((session) => {
      session.myCount = applyCount(session.myCount, action)
    })
}

/**
 * 直前のカウントを取り消す。
 * 実際に減らせたかを返す。既に0で空振りした場合は false を返し、
 * 画面側が操作履歴を消費してしまわないようにする。
 */
export async function decrementCount(id: string, action: CountAction): Promise<boolean> {
  let reverted = false
  await db.sessions
    .where('id')
    .equals(id)
    .modify((session) => {
      if (!canRevert(session.myCount, action)) return
      session.myCount = revertCount(session.myCount, action)
      reverted = true
    })
  return reverted
}

/**
 * 自分の実績カウントを部分更新する。
 *
 * `updateSession(id, { myCount: {...} })` のように丸ごと書き戻してはいけない。
 * 画面が持っている myCount は useLiveQuery が返した過去のスナップショットなので、
 * その間に入ったタップぶんを黙って巻き戻してしまう。
 * (ホールで「数えながら随時G数を更新する」という通常運用がそのまま再現手順になる)
 */
export async function updateMyCount(id: string, patch: Partial<MyCount>): Promise<void> {
  await db.sessions
    .where('id')
    .equals(id)
    .modify((session) => {
      session.myCount = { ...session.myCount, ...patch }
    })
}

/** 投資額を増減する。0未満にはしない */
export async function addInvest(id: string, delta: number): Promise<void> {
  await db.sessions
    .where('id')
    .equals(id)
    .modify((session) => {
      session.invest = Math.max(0, session.invest + delta)
    })
}

/**
 * 実戦を終了する。
 * 終了時カウンターと回収枚数はこの時点までに更新済みである前提。
 */
export async function finishSession(id: string): Promise<void> {
  await db.sessions.update(id, {
    status: 'finished',
    endedAt: new Date().toISOString(),
  })
}

/** 終了した実戦を実戦中に戻す(終了操作の取り消し) */
export async function reopenSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'active', endedAt: null })
}

/** セッションを削除する */
export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
}

/** 履歴を新しい順に取得する */
export async function listSessions(): Promise<Session[]> {
  const all = await db.sessions.toArray()
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/**
 * CSVから読み込んだセッションを取り込む。
 * 同じidがあれば上書きする(同じファイルを二重に取り込んでも増殖しない)。
 */
export async function importSessions(sessions: Session[]): Promise<number> {
  if (sessions.length === 0) return 0
  await db.sessions.bulkPut(sessions)
  return sessions.length
}

/** 指定日のセッションを取得する */
export async function listSessionsByDate(date: string): Promise<Session[]> {
  return db.sessions.where('date').equals(date).toArray()
}

/**
 * 入力途中の空レコードかどうか。
 * 新規実戦を開いてすぐ閉じた場合に、ゴミが履歴に残るのを避けるために使う。
 */
export function isBlankSession(session: Session): boolean {
  return (
    session.hall === '' &&
    session.machineNo === '' &&
    session.machineTypeId === '' &&
    session.invest === 0 &&
    session.start.games === 0 &&
    session.start.bb === 0 &&
    session.start.rb === 0
  )
}
