import { useEffect, useRef, useState } from 'react'
import { Button, Card, Field, ScreenHeader, Select, TextInput } from '../components/ui'
import { MACHINES } from '../data/machines'
import { getSettings, updateSettings } from '../db'
import { importSessions, listSessions } from '../db/sessions'
import { csvFileName, csvToSessions, sessionsToCsv } from '../lib/csv'
import { EXCHANGE_RATE_PRESETS, today } from '../lib/format'
import { requestPersistentStorage, type StorageStatus } from '../lib/storage'
import type { AppSettings } from '../types'

/**
 * 設定画面。
 * 既定値のほか、データのバックアップ(CSV)と保存状態の確認を行う。
 */
export function Settings({ navigate }: { navigate: (to: string, replace?: boolean) => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then(setSettings)
    requestPersistentStorage().then(setStorage)
  }, [])

  if (!settings) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted)]">読み込み中…</p>
  }

  const patch = async (next: Partial<Omit<AppSettings, 'id'>>) => {
    setSettings(await updateSettings(next))
  }

  const onExport = async () => {
    const sessions = await listSessions()
    if (sessions.length === 0) {
      setMessage('書き出す記録がありません')
      return
    }
    const blob = new Blob([sessionsToCsv(sessions)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = csvFileName(today())
    link.click()
    URL.revokeObjectURL(url)
    setMessage(`${sessions.length}件を書き出しました`)
  }

  const onImportFile = async (file: File) => {
    const { sessions, errors } = csvToSessions(await file.text())
    const count = await importSessions(sessions)
    const head = count > 0 ? `${count}件を取り込みました` : '取り込める記録がありませんでした'
    setMessage(errors.length > 0 ? `${head}(${errors.length}行を読み飛ばし: ${errors[0]})` : head)
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="設定" onBack={() => navigate('/', true)} />

      {message && (
        <p className="mb-3 rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs">
          {message}
        </p>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">新規実戦の既定値</h2>
        <div className="space-y-3">
          <Field label="交換率">
            <Select
              value={String(settings.defaultExchangeRate)}
              onChange={(v) => patch({ defaultExchangeRate: Number(v) })}
              options={EXCHANGE_RATE_PRESETS.map((p) => ({
                value: String(p.value),
                label: p.label,
              }))}
            />
          </Field>
          <Field label="店名" hint="実戦を開始するたびに、最後に使った値へ自動更新されます">
            <TextInput
              value={settings.defaultHall}
              onChange={(v) => patch({ defaultHall: v })}
              placeholder="よく行く店名"
            />
          </Field>
          <Field label="機種">
            <Select
              value={settings.defaultMachineTypeId ?? ''}
              onChange={(v) => patch({ defaultMachineTypeId: v || null })}
              options={MACHINES.map((m) => ({ value: m.id, label: m.name }))}
              placeholder="指定しない"
            />
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">バックアップ</h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          記録はこの端末の中だけに保存されます。外部へ送信されることはありません。
          その代わり、ブラウザのデータを消すと記録も消えます。
        </p>
        <div className="mt-3 space-y-2">
          <Button variant="secondary" onClick={onExport}>
            CSVに書き出す
          </Button>
          <Button variant="ghost" onClick={() => fileInput.current?.click()}>
            CSVから読み込む
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          読み込みは、同じ記録があれば上書きします。同じファイルを二重に取り込んでも増えません。
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">データの保存状態</h2>
        {storage === null ? (
          <p className="mt-2 text-xs text-[var(--color-muted)]">確認中…</p>
        ) : (
          <>
            <p className="mt-2 text-xs">
              永続化:{' '}
              {storage.persisted ? (
                <span className="text-[var(--color-plus)]">有効</span>
              ) : (
                <span className="text-[var(--color-minus)]">無効</span>
              )}
              {' / '}ホーム画面から起動:{' '}
              {storage.standalone ? (
                <span className="text-[var(--color-plus)]">はい</span>
              ) : (
                <span className="text-[var(--color-minus)]">いいえ</span>
              )}
            </p>
            {!storage.standalone && (
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-minus)]">
                ブラウザで開いたまま使うと、iPhoneでは7日間アクセスが無いだけで記録が消えることがあります。
                ブラウザの共有メニューから「ホーム画面に追加」して、そこから起動してください。
              </p>
            )}
            {storage.standalone && !storage.persisted && (
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
                永続化の要求が通っていません。端末の空き容量が減ると記録が削除される可能性があるため、
                CSVバックアップを定期的に取ってください。
              </p>
            )}
          </>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="text-sm font-semibold">機種マスタ({MACHINES.length}機種)</h2>
        <ul className="mt-2 space-y-1 text-xs">
          {MACHINES.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{m.name}</span>
              <span
                className={
                  m.dataStatus === 'verified'
                    ? 'shrink-0 text-[var(--color-plus)]'
                    : 'shrink-0 text-[var(--color-muted)]'
                }
              >
                {m.dataStatus === 'verified' ? '検証済' : '暫定値'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          「暫定値」は、メーカー非公表の小役確率について複数の解析値が流通している機種です。
          設定推測(Phase 3)では、その不確かさを考慮した表示を行います。
        </p>
      </Card>
    </div>
  )
}
