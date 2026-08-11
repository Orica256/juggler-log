import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CountPad } from '../components/CountPad'
import { RealtimeStats } from '../components/RealtimeStats'
import { Button, Card, Field, NumberInput, ScreenHeader } from '../components/ui'
import { findMachine } from '../data/machines'
import {
  addInvest,
  decrementCount,
  getSession,
  incrementCount,
  updateMyCount,
} from '../db/sessions'
import { workedHours } from '../lib/calc'
import { recommendedManualCount } from '../lib/discrimination'
import type { CountAction } from '../lib/counting'
import { formatDuration, formatYenPlain } from '../lib/format'
import { classifiedRb } from '../types'

const INVEST_STEP = 1000
/** 取り消し履歴の保持数。8000Gぶん全部持つ必要はない */
const MAX_HISTORY = 50

/** 実戦中の画面。ホールで打ちながら片手で操作する */
export function SessionPlay({
  id,
  navigate,
}: {
  id: string
  navigate: (to: string, replace?: boolean) => void
}) {
  const session = useLiveQuery(() => getSession(id), [id])
  const [now, setNow] = useState(() => new Date())
  /** 取り消し用の操作履歴。手動修正が入った時点で信用できなくなるので破棄する */
  const [history, setHistory] = useState<CountAction[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  /**
   * 総回転数の下書き。
   * 入力のたびにDBへ書くと、打ち終わる前の中間値(「1」など)で
   * 自分のG数が0に潰れてしまうため、確定するまでは画面内に留める。
   */
  const [draftGames, setDraftGames] = useState<string | null>(null)

  // 経過時間を1分ごとに更新する
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (!session) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const machine = findMachine(session.machineTypeId)
  const advice = machine ? recommendedManualCount(machine) : null
  const elapsed = workedHours(session.startedAt, null, now)
  const totalGames = session.start.games + session.myCount.games
  const unknownRb = session.myCount.rb - classifiedRb(session.myCount)

  const onCount = async (action: CountAction) => {
    try {
      await incrementCount(id, action)
      setNotice(null)
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), action])
    } catch {
      // 書き込めていないのに履歴へ積むと、次の取り消しが実在する1回を消してしまう
      setNotice('カウントを保存できませんでした。もう一度押してください')
    }
  }

  const onUndo = async () => {
    const last = history[history.length - 1]
    if (!last) return
    const reverted = await decrementCount(id, last)
    if (reverted) {
      setHistory((h) => h.slice(0, -1))
      return
    }
    // 空振りした = 手動修正などで実データと履歴がずれている
    setHistory([])
    setNotice('カウントが手動で変更されたため、取り消し履歴を消しました')
  }

  /** 手で直したら、それ以前の操作履歴は実データと対応しなくなる */
  const editCount = (patch: Parameters<typeof updateMyCount>[1]) => {
    setHistory([])
    updateMyCount(id, patch)
  }

  /** 台のデータカウンターの総回転数から、自分の消化G数を逆算して確定する */
  const commitTotalGames = () => {
    if (draftGames === null) return
    const parsed = Number(draftGames.replace(/[^\d]/g, ''))
    setDraftGames(null)
    // 空欄や着席時より小さい値は誤入力とみなし、既存の値を潰さない
    if (!Number.isFinite(parsed) || draftGames.trim() === '') return
    if (parsed < session.start.games) {
      setNotice('着席時の総回転数より小さい値は入力できません')
      return
    }
    updateMyCount(id, { games: parsed - session.start.games })
  }

  return (
    // フッターのカウントパッドに隠れないよう下に余白を取る
    <div className="pb-60">
      <ScreenHeader
        title={machine?.name ?? '実戦中'}
        onBack={() => navigate('/', true)}
        right={
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => navigate('/help')}
              className="text-sm text-[var(--color-muted)]"
            >
              使い方
            </button>
            <button
              type="button"
              onClick={() => navigate(`/start/${id}`)}
              className="text-sm text-[var(--color-muted)]"
            >
              開始情報
            </button>
          </div>
        }
      />

      {notice && (
        <p className="mb-3 rounded-lg border border-[var(--color-minus)] px-3 py-2 text-xs text-[var(--color-minus)]">
          {notice}
        </p>
      )}

      <Card>
        <div className="flex items-baseline justify-between text-xs text-[var(--color-muted)]">
          <span>
            {session.hall || '店名未入力'} / {session.machineNo || '台番未入力'}
          </span>
          <span>経過 {formatDuration(elapsed)}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">台の総回転数</span>
            <input
              type="text"
              inputMode="numeric"
              value={draftGames ?? String(totalGames)}
              onChange={(e) => setDraftGames(e.target.value)}
              onBlur={commitTotalGames}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="mt-1 min-h-12 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-right text-base tabular-nums text-[var(--color-text)] outline-none focus:border-[var(--color-muted)]"
            />
            <span className="mt-1 block text-xs text-[var(--color-muted)]">
              台のカウンターの数値をそのまま入力
            </span>
          </label>
          <div>
            <span className="text-xs text-[var(--color-muted)]">自分のG数</span>
            <p className="mt-1 flex h-12 items-center justify-end pr-3 text-2xl font-bold tabular-nums">
              {session.myCount.games.toLocaleString('ja-JP')}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[var(--color-muted)]">投資</span>
          <span className="text-2xl font-bold tabular-nums">
            {formatYenPlain(session.invest)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={() => addInvest(id, -INVEST_STEP)}>
            −1,000
          </Button>
          <Button
            variant="secondary"
            className="col-span-2"
            onClick={() => addInvest(id, INVEST_STEP)}
          >
            ＋1,000円
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        {machine ? (
          <RealtimeStats machine={machine} count={session.myCount} />
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            機種が未選択のため確率を表示できません。「開始情報」から機種を選んでください。
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">カウントの修正</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          押し間違いに気づいたときは、ここで直接直せます(取り消し履歴は消えます)。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="ぶどう">
            <NumberInput
              value={session.myCount.grape}
              onChange={(v) => editCount({ grape: v ?? 0 })}
            />
          </Field>
          <Field label="BB">
            <NumberInput value={session.myCount.bb} onChange={(v) => editCount({ bb: v ?? 0 })} />
          </Field>
          <Field label="REG(合計)">
            <NumberInput value={session.myCount.rb} onChange={(v) => editCount({ rb: v ?? 0 })} />
          </Field>
          <Field label="うち単独REG">
            <NumberInput
              value={session.myCount.soloRb}
              onChange={(v) => editCount({ soloRb: v ?? 0 })}
            />
          </Field>
          <Field label="うちチェリーREG">
            <NumberInput
              value={session.myCount.cherryRb}
              onChange={(v) => editCount({ cherryRb: v ?? 0 })}
            />
          </Field>
          <div>
            <span className="text-xs text-[var(--color-muted)]">うち分類できず</span>
            <p className="mt-1 flex h-12 items-center justify-end pr-3 text-base tabular-nums">
              {Math.max(0, unknownRb)}
            </p>
          </div>
        </div>
        {unknownRb < 0 && (
          <p className="mt-2 text-xs text-[var(--color-minus)]">
            単独REGとチェリーREGの合計がREG合計を上回っています。どれかが誤っています。
          </p>
        )}
      </Card>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => navigate(`/end/${id}`)}>
          実戦を終了する
        </Button>
      </div>

      <CountPad
        onCount={onCount}
        onUndo={onUndo}
        undoTarget={history[history.length - 1] ?? null}
        recommended={advice?.key ?? 'grape'}
        grapeCount={session.myCount.grape}
      />
    </div>
  )
}
