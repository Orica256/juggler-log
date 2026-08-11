import { useHashRoute } from './hooks/useHashRoute'
import { Help } from './screens/Help'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { SessionDetail } from './screens/SessionDetail'
import { SessionEnd } from './screens/SessionEnd'
import { SessionPlay } from './screens/SessionPlay'
import { SessionStart } from './screens/SessionStart'
import { Settings } from './screens/Settings'

export default function App() {
  const { segments, navigate } = useHashRoute()
  const [screen, id] = segments

  return (
    <>
      {/*
        ステータスバー(時刻・電池)の背後を塗りつぶす帯。
        viewport-fit=cover でこの領域まで描画されるため、これが無いと
        スクロールした本文が時刻表示に重なって読めなくなる。
      */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-30 bg-[var(--color-bg)]"
        style={{ height: 'env(safe-area-inset-top)' }}
      />
      <div className="mx-auto min-h-full max-w-md px-4 safe-bottom">{renderScreen()}</div>
    </>
  )

  function renderScreen() {
    switch (screen) {
      case undefined:
        return <Home navigate={navigate} />
      case 'start':
        return id ? <SessionStart id={id} navigate={navigate} /> : <Home navigate={navigate} />
      case 'play':
        return id ? <SessionPlay id={id} navigate={navigate} /> : <Home navigate={navigate} />
      case 'end':
        return id ? <SessionEnd id={id} navigate={navigate} /> : <Home navigate={navigate} />
      case 'session':
        return id ? <SessionDetail id={id} navigate={navigate} /> : <History navigate={navigate} />
      case 'history':
        return <History navigate={navigate} />
      case 'help':
        return <Help navigate={navigate} />
      case 'settings':
        return <Settings navigate={navigate} />
      default:
        return <Home navigate={navigate} />
    }
  }
}
