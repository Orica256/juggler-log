/**
 * 共通UI部品
 *
 * ホールで片手・親指操作することを前提に、タップ領域は最低56pxを確保する。
 * 入力欄は数値キーボードが出るように inputMode を指定する。
 */
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 ${className}`}
    >
      {children}
    </div>
  )
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-bg)]/95 px-4 py-3 backdrop-blur">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="戻る"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-[var(--color-muted)] active:bg-[var(--color-line)]"
        >
          ‹
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-plus)] text-black font-bold active:brightness-90',
  secondary: 'bg-[var(--color-line)] text-[var(--color-text)] active:brightness-125',
  danger: 'bg-transparent text-[var(--color-minus)] border border-[var(--color-minus)] active:bg-[var(--color-minus)]/10',
  ghost: 'bg-transparent text-[var(--color-muted)] active:bg-[var(--color-line)]',
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 w-full rounded-xl px-4 text-base transition disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  )
}

const INPUT_CLASS =
  'mt-1 min-h-12 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-muted)]'

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLASS}
    />
  )
}

/**
 * 数値入力。
 * 空欄を許容するため内部では文字列で保持し、確定した数値だけを親へ渡す。
 * null許容(差枚数など未取得のことがある項目)にも対応する。
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  allowNegative = false,
  nullable = false,
  suffix,
}: {
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  allowNegative?: boolean
  nullable?: boolean
  suffix?: string
}) {
  const handle = (raw: string) => {
    const cleaned = raw.replace(/[^\d-]/g, '')
    if (cleaned === '' || cleaned === '-') {
      onChange(nullable ? null : 0)
      return
    }
    const parsed = Number(cleaned)
    if (!Number.isFinite(parsed)) return
    onChange(allowNegative ? parsed : Math.max(0, parsed))
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode={allowNegative ? 'text' : 'numeric'}
        value={value === null ? '' : String(value)}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={`${INPUT_CLASS} ${suffix ? 'pr-10' : ''} text-right tabular-nums`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 bottom-3 text-xs text-[var(--color-muted)]">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${INPUT_CLASS} appearance-none`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** 収支などの符号つき数値を色分けして表示する */
export function SignedValue({
  value,
  text,
  className = '',
}: {
  value: number
  text: string
  className?: string
}) {
  const color =
    value > 0
      ? 'text-[var(--color-plus)]'
      : value < 0
        ? 'text-[var(--color-minus)]'
        : 'text-[var(--color-muted)]'
  return <span className={`tabular-nums ${color} ${className}`}>{text}</span>
}

/** 値が無いときの控えめな案内 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-12 text-center text-sm text-[var(--color-muted)]">{children}</p>
  )
}
