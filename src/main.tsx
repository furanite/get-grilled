import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import './intro.css'
import './extras.css'
import App from './App'
import { HOST_EDITION, ISLAMIC_SET } from './lib/edition'
import { detectServer, hostMe } from './lib/live'
import { loadSettings } from './lib/store'
import { STRINGS } from './lib/i18n'
import { HostLogin, setLiveServer } from './components/LiveHost'
import RemoteDevice from './components/RemoteDevice'
import { AudiencePhone } from './components/LiveAudience'

/**
 * On GitHub Pages (or any plain host) this is just the game. When a Get Grilled Live server is
 * behind the page (the Raspberry Pi), the host edition asks for the host PIN first, and the
 * normal app becomes a team tablet or projector screen opened from the host's links.
 */
function Root() {
  const [mode, setMode] = useState<'loading' | 'app' | 'login' | 'device' | 'phone'>('loading')
  const [pinSet, setPinSet] = useState(true)
  useEffect(() => {
    void detectServer().then(async (h) => {
      if (!h) return setMode('app')
      setLiveServer(true)
      setPinSet(h.pinSet)
      if (!HOST_EDITION) return setMode(new URLSearchParams(location.search).get('a') === '1' ? 'phone' : 'device')
      setMode((await hostMe()) ? 'app' : 'login')
    })
  }, [])
  const settings = loadSettings()
  if (mode === 'loading') return null
  if (mode === 'device') return <RemoteDevice fallbackLang={settings.lang} />
  if (mode === 'phone') return <AudiencePhone fallbackLang={settings.lang} />
  if (mode === 'login') {
    document.documentElement.dataset.theme = settings.theme
    return <HostLogin t={STRINGS[settings.lang]} theme={settings.theme} pinSet={pinSet} onIn={() => setMode('app')} />
  }
  return <App />
}

if (ISLAMIC_SET) document.documentElement.dataset.set = 'islamic'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
