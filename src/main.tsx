import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import App from './App'
import { ISLAMIC_SET } from './lib/edition'

if (ISLAMIC_SET) document.documentElement.dataset.set = 'islamic'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
