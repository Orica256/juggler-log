/**
 * IndexedDB スキーマ定義(Dexie)
 *
 * データはすべて端末内に保存する。クラウド同期は行わない。
 * 機種マスタ(MachineSpec)は src/data/machines.ts のコード内定義を正とし、
 * ユーザーが編集した場合のみ machines テーブルに上書き分を保存する。
 */
import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, MachineSpec, Session } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  id: 'singleton',
  defaultExchangeRate: 20.0,
  defaultHall: '',
  defaultMachineTypeId: null,
  lowSettingAlertThreshold: 80,
  reliableGamesThreshold: 3000,
}

export class JugglerDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>
  machines!: EntityTable<MachineSpec, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('juggler-log')

    // v1: 履歴一覧の絞り込み用に date / hall / machineTypeId / status に索引を張る
    this.version(1).stores({
      sessions: 'id, date, hall, machineTypeId, status, startedAt',
      machines: 'id',
      settings: 'id',
    })

    // v2: チェリー重複REGの回数を追加(索引は変わらない)
    this.version(2)
      .stores({
        sessions: 'id, date, hall, machineTypeId, status, startedAt',
        machines: 'id',
        settings: 'id',
      })
      .upgrade((tx) =>
        tx
          .table<Session>('sessions')
          .toCollection()
          .modify((session) => {
            session.myCount.cherryRb ??= 0
          }),
      )
  }
}

export const db = new JugglerDB()

/** アプリ設定を取得する(未作成なら既定値で初期化する) */
export async function getSettings(): Promise<AppSettings> {
  const found = await db.settings.get('singleton')
  if (found) return found
  await db.settings.put(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

/** アプリ設定を部分更新する */
export async function updateSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await db.settings.put(next)
  return next
}
