import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { requestPersistentStorage } from './lib/storage'
import './index.css'

// 収支の記録が勝手に消されないよう、起動時に永続化を要求しておく。
// 失敗しても動作には影響しないため、結果は待たない(状態は設定画面で確認できる)。
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
