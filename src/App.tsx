import { useHashRoute } from './hooks/useHashRoute'
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
    <div className="mx-auto min-h-full max-w-md px-4 safe-bottom">{renderScreen()}</div>
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
      case 'settings':
        return <Settings navigate={navigate} />
      default:
        return <Home navigate={navigate} />
    }
  }
}
