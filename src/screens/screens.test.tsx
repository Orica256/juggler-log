// @vitest-environment jsdom
/**
 * 画面の描画スモークテスト
 *
 * 画面テストだけ jsdom で動かす(純粋なロジックのテストは Node のままにして速く回す)
 *
 * 計算やDB操作が正しくても、画面が例外で落ちれば実戦では使えない。
 * 各画面が「実際にDBへ保存された値を読んで描画できる」ところまでを確認する。
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db'
import { finishSession, getSession, startSession, updateSession } from '../db/sessions'
import { Estimate } from './Estimate'
import { Help } from './Help'
import { History } from './History'
import { Home } from './Home'
import { SessionDetail } from './SessionDetail'
import { SessionEnd } from './SessionEnd'
import { SessionPlay } from './SessionPlay'
import { SessionStart } from './SessionStart'
import { Stats } from './Stats'
import { Settings } from './Settings'
import { today } from '../lib/format'

const navigate = vi.fn()

// vitest の globals を有効にしていないため自動クリーンアップが働かない。
// 明示的に片付けないと前のテストの描画が残り、要素が重複して検出される。
afterEach(cleanup)

beforeEach(async () => {
  navigate.mockClear()
  await db.sessions.clear()
  await db.settings.clear()
})

/** 収支+10,000円で確定済みのセッションを1件作る */
async function createFinishedSession() {
  const session = await startSession()
  await updateSession(session.id, {
    date: today(),
    hall: '〇〇会館',
    machineNo: '123',
    machineTypeId: 'my-juggler-v',
    start: { games: 12000, bb: 40, rb: 30, medals: 1500 },
    end: { games: 15000, bb: 52, rb: 38, medals: 2400 },
    invest: 20000,
    payoutMedals: 1500,
    exchangeRate: 20,
  })
  await finishSession(session.id)
  return session.id
}

describe('ホーム', () => {
  it('記録が無いときは案内を出す', async () => {
    render(<Home navigate={navigate} />)
    expect(await screen.findByText('記録なし')).toBeDefined()
    expect(screen.getByText('＋ 新規実戦をはじめる')).toBeDefined()
  })

  it('確定済みの記録から今日の収支を集計する', async () => {
    await createFinishedSession()
    render(<Home navigate={navigate} />)

    // 今日の収支合計と、その明細の両方に同じ金額が出る
    expect((await screen.findAllByText('+10,000円')).length).toBe(2)
    expect(screen.getByText('マイジャグラーV')).toBeDefined()
  })

  it('実戦中のセッションがあれば復帰できる', async () => {
    const session = await startSession()
    await updateSession(session.id, { hall: '△△ホール', machineTypeId: 'gogo-juggler-3' })

    render(<Home navigate={navigate} />)
    expect((await screen.findAllByText('実戦中')).length).toBeGreaterThan(0)
    expect(screen.getByText('実戦に戻る')).toBeDefined()
  })
})

describe('実戦開始', () => {
  it('選んだ機種に応じて数えるべき指標を出す', async () => {
    const session = await startSession()
    await updateSession(session.id, { machineTypeId: 'my-juggler-v' })

    render(<SessionStart id={session.id} navigate={navigate} />)

    // マイジャグラーVは単独REGのほうが情報量が多い
    expect(await screen.findByText('単独REG')).toBeDefined()
    expect(screen.getByText(/単独REGはぶどうの約/)).toBeDefined()
  })

  it('ゴーゴージャグラー3ではぶどうを勧める', async () => {
    const session = await startSession()
    await updateSession(session.id, { machineTypeId: 'gogo-juggler-3' })

    render(<SessionStart id={session.id} navigate={navigate} />)
    expect(await screen.findByText('ぶどう')).toBeDefined()
  })
})

describe('実戦中', () => {
  /** 着席時12,000Gの台に座り、3,000G消化した状態を作る */
  async function playingSession(machineTypeId = 'my-juggler-v') {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId,
      invest: 15000,
      start: { games: 12000, bb: 40, rb: 30, medals: 1500 },
      myCount: { games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 5, cherryRb: 3 },
    })
    return session.id
  }

  it('投資額と自分のG数を表示する', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    expect(await screen.findByText('15,000円')).toBeDefined()
    expect(screen.getByText('3,000')).toBeDefined()
  })

  it('リアルタイムの確率を理論値レンジとともに出す', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    // 3000G / BB12・RB8 → 合算 1/150.00
    expect(await screen.findByText('1/150.00')).toBeDefined()

    // ぶどうの分母はボーナス消化ぶんを除いた通常時G数を使う。
    // マイジャグラーVは BIG20G / REG8G なので 3000 -(12×20 + 8×8)= 2696G。
    // 総G数で割った 1/6.00 ではなく 1/5.39 になる(補正しないと約1割悪く出る)
    expect(screen.getByText('ぶどうの分母: 通常時 2,696G')).toBeDefined()
    expect(screen.getByText('1/5.39')).toBeDefined()
    expect(screen.queryByText('1/6.00')).toBeNull()

    // マイジャグラーVの合算レンジ
    expect(screen.getByText('設定1 1/163.8')).toBeDefined()
    expect(screen.getByText('設定6 1/114.6')).toBeDefined()
  })

  it('ぶどうを押すと記録が増える', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    // 指が滑って離す位置がずれても取りこぼさないよう、押下時点で加算する
    fireEvent.pointerDown(await screen.findByRole('button', { name: /ぶどう ＋1/ }))

    await waitFor(async () => {
      expect((await getSession(id))?.myCount.grape).toBe(501)
    })
  })

  it('単独REGはREG合計と単独REGの両方を増やす', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    fireEvent.pointerDown(await screen.findByRole('button', { name: /^単独/ }))

    await waitFor(async () => {
      const saved = await getSession(id)
      expect(saved?.myCount.rb).toBe(9)
      expect(saved?.myCount.soloRb).toBe(6)
    })
  })

  it('押し間違いを1手で取り消せる', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    fireEvent.pointerDown(await screen.findByRole('button', { name: /ぶどう ＋1/ }))
    await waitFor(async () => expect((await getSession(id))?.myCount.grape).toBe(501))

    fireEvent.click(screen.getByRole('button', { name: '取り消し' }))
    await waitFor(async () => expect((await getSession(id))?.myCount.grape).toBe(500))
  })

  it('操作履歴が無いときは取り消せない', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    const undo = await screen.findByRole('button', { name: '取り消し' })
    expect((undo as HTMLButtonElement).disabled).toBe(true)
  })

  it('機種ごとに推奨する指標が変わる', async () => {
    const id = await playingSession('gogo-juggler-3')
    render(<SessionPlay id={id} navigate={navigate} />)

    // ゴーゴージャグラー3はぶどうが主指標。ぶどうボタンに推奨が付く
    expect(await screen.findByRole('button', { name: /ぶどう ＋1推奨/ })).toBeDefined()
  })

  it('分類したREGがREG合計を超えたら矛盾を知らせる', async () => {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId: 'my-juggler-v',
      myCount: { games: 1000, bb: 2, rb: 1, grape: 170, soloRb: 3, cherryRb: 1 },
    })

    render(<SessionPlay id={session.id} navigate={navigate} />)
    expect(await screen.findByText(/REG合計を上回っています/)).toBeDefined()
  })

  it('分類できなかったREGを単独にもチェリーにも寄せずに記録できる', async () => {
    const id = await playingSession()
    render(<SessionPlay id={id} navigate={navigate} />)

    fireEvent.pointerDown(await screen.findByRole('button', { name: /^不明/ }))

    await waitFor(async () => {
      const saved = await getSession(id)
      expect(saved?.myCount.rb).toBe(9)
      expect(saved?.myCount.soloRb).toBe(5)
      expect(saved?.myCount.cherryRb).toBe(3)
    })
  })

  it('単独REGが0回でも、分類していない場合と区別して表示する', async () => {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId: 'my-juggler-v',
      myCount: { games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 0, cherryRb: 8 },
    })

    render(<SessionPlay id={session.id} navigate={navigate} />)
    // 8回すべてチェリー重複だった = 単独0回という強い証拠。「未計測」ではない
    expect(await screen.findByText('0回(分類済みREG 8回中)')).toBeDefined()
  })
})

describe('実戦終了', () => {
  it('差分から自分の実績を計算して表示する', async () => {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId: 'my-juggler-v',
      start: { games: 12000, bb: 40, rb: 30, medals: 1500 },
      end: { games: 15000, bb: 52, rb: 38, medals: 2400 },
      invest: 20000,
      payoutMedals: 1500,
      exchangeRate: 20,
    })

    render(<SessionEnd id={session.id} navigate={navigate} />)

    // 3000G / BB12・RB8 → 合算 1/150.0
    expect(await screen.findByText('3,000')).toBeDefined()
    expect(screen.getByText('12 / 8')).toBeDefined()
    expect(screen.getByText('1/150.0')).toBeDefined()
    expect(screen.getByText('+10,000円')).toBeDefined()
  })
})

describe('履歴と詳細', () => {
  it('累計収支と勝率を出す', async () => {
    await createFinishedSession()
    render(<History navigate={navigate} />)

    expect(await screen.findByText('累計収支(1台)')).toBeDefined()
    expect(screen.getByText('勝率 100%(1勝0敗)')).toBeDefined()
  })

  it('詳細で収支の内訳を出す', async () => {
    const id = await createFinishedSession()
    render(<SessionDetail id={id} navigate={navigate} />)

    expect(await screen.findByText('+10,000円')).toBeDefined()
    expect(screen.getByText(/投資 20,000円 \/ 回収 30,000円/)).toBeDefined()
  })
})

describe('統計', () => {
  /** 収支が profit 円になる確定済みの記録を作る */
  async function finished(patch: {
    profit: number
    date?: string
    hall?: string
    machineTypeId?: string
  }) {
    const invest = 20000
    const session = await startSession()
    await updateSession(session.id, {
      date: patch.date ?? today(),
      hall: patch.hall ?? '〇〇会館',
      machineTypeId: patch.machineTypeId ?? 'my-juggler-v',
      invest,
      payoutMedals: (invest + patch.profit) / 20,
      exchangeRate: 20,
      myCount: { games: 3000, bb: 12, rb: 8, grape: 500, soloRb: 5, cherryRb: 3 },
    })
    await finishSession(session.id)
    return session.id
  }

  it('記録が無ければその旨を出す', async () => {
    render(<Stats navigate={navigate} />)
    expect(await screen.findByText('この期間の記録がありません')).toBeDefined()
  })

  it('収支・勝率・回転数をまとめて出す', async () => {
    await finished({ profit: 30000 })
    await finished({ profit: -10000 })

    render(<Stats navigate={navigate} />)

    // 合計はサマリと累計グラフの最新値の両方に出る
    expect((await screen.findAllByText('+20,000円')).length).toBeGreaterThan(0)
    expect(screen.getByText('50%')).toBeDefined()
    expect(screen.getByText('1勝1敗')).toBeDefined()
    expect(screen.getByText('6,000')).toBeDefined()
  })

  it('機種別・店舗別・曜日別に分けて出す', async () => {
    await finished({ profit: 30000, machineTypeId: 'my-juggler-v', hall: 'A店' })
    await finished({ profit: -10000, machineTypeId: 'gogo-juggler-3', hall: 'B店' })

    render(<Stats navigate={navigate} />)

    expect(await screen.findByText('機種別')).toBeDefined()
    expect(screen.getByText('マイジャグラーV')).toBeDefined()
    expect(screen.getByText('ゴーゴージャグラー3')).toBeDefined()
    expect(screen.getByText('A店')).toBeDefined()
    expect(screen.getByText('曜日別')).toBeDefined()
  })

  it('最高と最低の台を出す', async () => {
    await finished({ profit: 30000 })
    await finished({ profit: -10000 })

    render(<Stats navigate={navigate} />)
    expect(await screen.findByText('最高')).toBeDefined()
    expect(screen.getByText('最低')).toBeDefined()
  })

  it('実戦中の記録は集計に入れない', async () => {
    await finished({ profit: 30000 })
    const active = await startSession()
    await updateSession(active.id, { invest: 50000, payoutMedals: 0, exchangeRate: 20 })

    render(<Stats navigate={navigate} />)

    // 実戦中の -50,000円 が混ざっていれば合計は変わってしまう
    expect((await screen.findAllByText('+30,000円')).length).toBeGreaterThan(0)
    expect(screen.queryByText('-20,000円')).toBeNull()
    expect(screen.getByText(/実戦中の記録は収支が確定していないため/)).toBeDefined()
  })

  it('期間で絞り込める', async () => {
    await finished({ profit: 30000, date: today() })
    await finished({ profit: 5000, date: '2020-01-15' })

    render(<Stats navigate={navigate} />)
    // 既定は「すべて」なので両方が入る
    expect((await screen.findAllByText('+35,000円')).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '今月' }))
    await waitFor(() => {
      expect(screen.getAllByText('+30,000円').length).toBeGreaterThan(0)
      expect(screen.queryByText('+35,000円')).toBeNull()
    })
  })
})

describe('設定推測', () => {
  /** マイジャグラーVを1万G打ち、設定6の理論値どおりに当たった状態 */
  async function highSettingSession() {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId: 'my-juggler-v',
      myCount: { games: 10000, bb: 44, rb: 44, grape: 1541, soloRb: 30, cherryRb: 14 },
    })
    return session.id
  }

  it('設定ごとの確からしさと期待設定を出す', async () => {
    const id = await highSettingSession()
    render(<Estimate id={id} navigate={navigate} />)

    expect(await screen.findByText('期待設定')).toBeDefined()
    expect(screen.getByText('設定ごとの確からしさ')).toBeDefined()
    expect(screen.getByText('設定6')).toBeDefined()
  })

  it('判断材料が乏しいうちは、その旨をはっきり書く', async () => {
    const session = await startSession()
    await updateSession(session.id, {
      machineTypeId: 'my-juggler-v',
      myCount: { games: 300, bb: 1, rb: 1, grape: 49, soloRb: 1, cherryRb: 0 },
    })

    render(<Estimate id={session.id} navigate={navigate} />)
    expect(await screen.findByText(/この数字で設定を判断しないでください/)).toBeDefined()
  })

  it('何がそう言っているのかを指標ごとに示す', async () => {
    const id = await highSettingSession()
    render(<Estimate id={id} navigate={navigate} />)

    expect(await screen.findByText('何がそう言っているのか')).toBeDefined()
    expect(screen.getByText('ボーナス(BB / REG)')).toBeDefined()
    expect(screen.getByText('単独REG')).toBeDefined()
  })

  it('解析値が割れている機種では感度分析の結果を出す', async () => {
    const id = await highSettingSession()
    render(<Estimate id={id} navigate={navigate} />)

    // マイジャグラーVは設定6のぶどうが 1/5.69 と 1/5.66 で割れている
    expect(await screen.findByText('ぶどう解析値の食い違いについて')).toBeDefined()
    expect(screen.getByText(/どちらを採用しても結論は変わりません/)).toBeDefined()
  })

  it('一様な事前分布で計算していることを断っている', async () => {
    const id = await highSettingSession()
    render(<Estimate id={id} navigate={navigate} />)
    expect(await screen.findByText(/すべての設定が同じ割合で使われている前提/)).toBeDefined()
  })

  it('機種未選択なら推測できないと伝える', async () => {
    const session = await startSession()
    render(<Estimate id={session.id} navigate={navigate} />)
    expect(await screen.findByText(/機種が選ばれていないため推測できません/)).toBeDefined()
  })
})

describe('使い方', () => {
  it('初心者が迷いやすい項目の説明を載せている', async () => {
    render(<Help navigate={navigate} />)

    expect(await screen.findByText('ジャグラーの用語')).toBeDefined()
    expect(screen.getByText('ぶどう・単独REGの数え方(重要)')).toBeDefined()
    expect(screen.getByText('数字の読み方')).toBeDefined()
  })

  it('着席時カウンターは前任者ぶんを含めて入れると明記している', async () => {
    render(<Help navigate={navigate} />)
    expect(await screen.findByText(/前の人が打ったぶんを含んだ、今表示されている数字/)).toBeDefined()
  })

  it('分からないREGを推測で分類しないよう警告している', async () => {
    render(<Help navigate={navigate} />)
    expect(await screen.findByText(/必ず「不明REG」を押してください/)).toBeDefined()
  })
})

describe('設定', () => {
  it('機種マスタ9機種と暫定値の注記を出す', async () => {
    render(<Settings navigate={navigate} />)

    expect(await screen.findByText('機種マスタ(9機種)')).toBeDefined()
    await waitFor(() => expect(screen.getAllByText('暫定値').length).toBeGreaterThan(0))
  })
})
