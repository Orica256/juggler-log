/**
 * 端末内ストレージの永続化
 *
 * ブラウザは容量が逼迫すると保存データを勝手に捨てる。
 * とくに iOS Safari は、7日間アクセスの無いサイトのIndexedDBを削除する。
 * 収支の記録が消えるのは致命的なので、永続化を明示的に要求する。
 *
 * ただし要求が通る保証はない(ホーム画面に追加していないと拒否されやすい)。
 * そのため CSVエクスポートによるバックアップは必須で、UIでもそう案内する。
 */

export interface StorageStatus {
  /** 永続化が有効か。false なら消える可能性がある */
  persisted: boolean
  /** ブラウザが永続化APIに対応しているか */
  supported: boolean
  /** ホーム画面に追加された状態で開いているか */
  standalone: boolean
}

/** ホーム画面から起動されているか(iOSの削除対象から外れる条件) */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari は display-mode を返さないため独自プロパティを見る
  return (navigator as { standalone?: boolean }).standalone === true
}

/**
 * 永続化を要求する。既に永続化されていれば何もしない。
 * 失敗しても致命的ではないので、例外は投げずに状態を返す。
 */
export async function requestPersistentStorage(): Promise<StorageStatus> {
  const standalone = isStandalone()
  const supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.persist === 'function' &&
    typeof navigator.storage?.persisted === 'function'

  if (!supported) return { persisted: false, supported: false, standalone }

  try {
    if (await navigator.storage.persisted()) {
      return { persisted: true, supported: true, standalone }
    }
    const granted = await navigator.storage.persist()
    return { persisted: granted, supported: true, standalone }
  } catch {
    return { persisted: false, supported: true, standalone }
  }
}
