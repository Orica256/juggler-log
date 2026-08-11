/** 表示用の書式変換。計算は calc.ts、こちらは見た目だけを扱う */

/** 金額を符号つきで表示する。例) 12300 → 「+12,300円」 */
export function formatYen(yen: number): string {
  const sign = yen > 0 ? '+' : yen < 0 ? '-' : '±'
  return `${sign}${Math.abs(yen).toLocaleString('ja-JP')}円`
}

/** 符号を付けずに金額を表示する。例) 12300 → 「12,300円」 */
export function formatYenPlain(yen: number): string {
  return `${Math.round(yen).toLocaleString('ja-JP')}円`
}

/** 確率を 1/x 形式で表示する。母数が足りず算出できない場合は「---」 */
export function formatProb(denominator: number | null, fractionDigits = 2): string {
  if (denominator === null || !Number.isFinite(denominator)) return '---'
  return `1/${denominator.toFixed(fractionDigits)}`
}

/** 枚数を符号つきで表示する */
export function formatMedals(medals: number | null): string {
  if (medals === null) return '---'
  const sign = medals > 0 ? '+' : medals < 0 ? '-' : '±'
  return `${sign}${Math.abs(medals).toLocaleString('ja-JP')}枚`
}

/** 実働時間を「2時間30分」形式で表示する */
export function formatDuration(hours: number): string {
  const totalMinutes = Math.floor(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}分`
  return `${h}時間${m}分`
}

/** YYYY-MM-DD を「8/11(月)」形式にする */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${weekday})`
}

/** ローカルタイムゾーンでの今日の日付を YYYY-MM-DD で返す */
export function today(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 時刻を HH:MM で表示する */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 交換率のプリセット。値はメダル1枚あたりの円 */
export const EXCHANGE_RATE_PRESETS = [
  { label: '等価(5.0枚)', value: 20.0 },
  { label: '5.5枚', value: 100 / 5.5 },
  { label: '5.6枚', value: 100 / 5.6 },
  { label: '6.0枚', value: 100 / 6.0 },
  { label: '6.5枚', value: 100 / 6.5 },
  { label: '7.0枚', value: 100 / 7.0 },
] as const

/** 交換率(円/枚)を「5.6枚」のような表示に直す */
export function formatExchangeRate(yenPerMedal: number): string {
  const preset = EXCHANGE_RATE_PRESETS.find((p) => Math.abs(p.value - yenPerMedal) < 0.01)
  if (preset) return preset.label
  return `${yenPerMedal.toFixed(2)}円/枚`
}
