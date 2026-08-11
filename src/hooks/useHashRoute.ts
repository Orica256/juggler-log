/**
 * ハッシュによる簡易ルーティング
 *
 * ルーティングライブラリを足すほどの画面数ではないので自前で持つ。
 * ハッシュを使うのは、GitHub Pages のような静的ホスティングでも
 * リロード時に404にならないため。スマホの戻るボタンもそのまま効く。
 */
import { useCallback, useEffect, useState } from 'react'

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash === '' ? '/' : hash
}

export function useHashRoute() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  /** 画面を移動する。replace=true なら戻る履歴に残さない */
  const navigate = useCallback((to: string, replace = false) => {
    const next = `#${to}`
    if (replace) window.location.replace(next)
    else window.location.hash = to
    // hashchange は同じハッシュへの遷移では発火しないので念のため同期する
    setPath(to)
  }, [])

  const back = useCallback(() => window.history.back(), [])

  /** '/session/:id' のような形から id を取り出す */
  const segments = path.split('/').filter(Boolean)

  return { path, segments, navigate, back }
}
