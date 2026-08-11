import { beforeEach, describe, expect, it } from 'vitest'
import { db, getSettings, updateSettings } from './index'
import {
  addInvest,
  decrementCount,
  deleteSession,
  finishSession,
  getActiveSession,
  getSession,
  incrementCount,
  isBlankSession,
  listSessions,
  reopenSession,
  startSession,
  updateSession,
} from './sessions'
import { profit } from '../lib/calc'

beforeEach(async () => {
  await db.sessions.clear()
  await db.settings.clear()
})

describe('セッションのライフサイクル', () => {
  it('開始したセッションは実戦中として取得できる', async () => {
    const created = await startSession()
    const active = await getActiveSession()
    expect(active?.id).toBe(created.id)
    expect(active?.status).toBe('active')
    expect(active?.endedAt).toBeNull()
  })

  it('終了すると実戦中ではなくなる', async () => {
    const created = await startSession()
    await finishSession(created.id)

    expect(await getActiveSession()).toBeUndefined()
    const finished = await getSession(created.id)
    expect(finished?.status).toBe('finished')
    expect(finished?.endedAt).not.toBeNull()
  })

  it('終了を取り消すと実戦中に戻る', async () => {
    const created = await startSession()
    await finishSession(created.id)
    await reopenSession(created.id)

    const active = await getActiveSession()
    expect(active?.id).toBe(created.id)
    expect(active?.endedAt).toBeNull()
  })

  it('削除すると取得できなくなる', async () => {
    const created = await startSession()
    await deleteSession(created.id)
    expect(await getSession(created.id)).toBeUndefined()
  })
})

describe('逐次保存', () => {
  it('入力のたびの更新がその場で永続化される', async () => {
    const created = await startSession()

    // 画面上で1項目ずつ入力していく状況を再現する
    await updateSession(created.id, { hall: '〇〇会館' })
    await updateSession(created.id, { machineNo: '123' })
    await updateSession(created.id, { machineTypeId: 'my-juggler-v' })
    await updateSession(created.id, { invest: 3000 })

    const saved = await getSession(created.id)
    expect(saved).toMatchObject({
      hall: '〇〇会館',
      machineNo: '123',
      machineTypeId: 'my-juggler-v',
      invest: 3000,
    })
  })

  it('入れ子になったカウンターも丸ごと差し替えできる', async () => {
    const created = await startSession()
    await updateSession(created.id, { start: { games: 12000, bb: 40, rb: 30, medals: 1500 } })
    await updateSession(created.id, { end: { games: 15000, bb: 52, rb: 38, medals: 900 } })

    const saved = await getSession(created.id)
    expect(saved?.start.games).toBe(12000)
    expect(saved?.end?.bb).toBe(52)
    // 片方を更新しても、もう片方が壊れていない
    expect(saved?.start.medals).toBe(1500)
  })

  it('差枚が未取得(null)のまま保存できる', async () => {
    const created = await startSession()
    await updateSession(created.id, { start: { games: 5000, bb: 20, rb: 15, medals: null } })

    const saved = await getSession(created.id)
    expect(saved?.start.medals).toBeNull()
  })
})

describe('既定値の引き継ぎ', () => {
  it('設定に保存した店名・機種・交換率が新規実戦に反映される', async () => {
    await updateSettings({
      defaultHall: '△△ホール',
      defaultMachineTypeId: 'gogo-juggler-3',
      defaultExchangeRate: 100 / 5.6,
    })

    const created = await startSession()
    expect(created.hall).toBe('△△ホール')
    expect(created.machineTypeId).toBe('gogo-juggler-3')
    expect(created.exchangeRate).toBeCloseTo(100 / 5.6)
  })

  it('設定が未作成でも既定値で動く', async () => {
    const settings = await getSettings()
    expect(settings.defaultExchangeRate).toBe(20)

    const created = await startSession()
    expect(created.exchangeRate).toBe(20)
    expect(created.machineTypeId).toBe('')
  })
})

describe('履歴', () => {
  it('新しい順に並ぶ', async () => {
    const first = await startSession()
    await updateSession(first.id, { startedAt: '2026-08-09T10:00:00.000Z' })
    const second = await startSession()
    await updateSession(second.id, { startedAt: '2026-08-11T10:00:00.000Z' })

    const list = await listSessions()
    expect(list.map((s) => s.id)).toEqual([second.id, first.id])
  })

  it('保存した内容から収支が算出できる', async () => {
    const created = await startSession()
    await updateSession(created.id, { invest: 20000, payoutMedals: 1500, exchangeRate: 20 })
    await finishSession(created.id)

    const saved = await getSession(created.id)
    expect(profit(saved!)).toBe(10000)
  })
})

describe('空レコードの判定', () => {
  it('開いてすぐ閉じたセッションは空とみなす', async () => {
    const created = await startSession()
    expect(isBlankSession(created)).toBe(true)
  })

  it('何か入力されていれば空ではない', async () => {
    const created = await startSession()
    await updateSession(created.id, { machineNo: '123' })
    expect(isBlankSession((await getSession(created.id))!)).toBe(false)
  })

  it('店名の既定値が入っているだけなら、投資もカウンターも無いので空扱いにはならない', async () => {
    await updateSettings({ defaultHall: '△△ホール' })
    const created = await startSession()
    // 既定値の店名が入るため空判定にはならない。ゴミが残る場合は手動削除できればよい
    expect(isBlankSession(created)).toBe(false)
  })
})

describe('実戦中のカウント', () => {
  it('ぶどうを連打しても取りこぼさない', async () => {
    const created = await startSession()

    // ぶどうは1000Gあたり約170回押される。同時に走っても全て積み上がること
    await Promise.all(Array.from({ length: 50 }, () => incrementCount(created.id, 'grape')))

    const saved = await getSession(created.id)
    expect(saved?.myCount.grape).toBe(50)
  })

  it('単独REGはREG合計と単独REGの両方が増える', async () => {
    const created = await startSession()
    await incrementCount(created.id, 'soloRb')
    await incrementCount(created.id, 'cherryRb')

    const saved = await getSession(created.id)
    expect(saved?.myCount.rb).toBe(2)
    expect(saved?.myCount.soloRb).toBe(1)
  })

  it('取り消すと元に戻る', async () => {
    const created = await startSession()
    await incrementCount(created.id, 'soloRb')
    await decrementCount(created.id, 'soloRb')

    const saved = await getSession(created.id)
    expect(saved?.myCount.rb).toBe(0)
    expect(saved?.myCount.soloRb).toBe(0)
  })

  it('投資は連続加算しても取りこぼさず、0未満にはならない', async () => {
    const created = await startSession()
    await Promise.all(Array.from({ length: 10 }, () => addInvest(created.id, 1000)))
    expect((await getSession(created.id))?.invest).toBe(10000)

    await addInvest(created.id, -30000)
    expect((await getSession(created.id))?.invest).toBe(0)
  })
})
