import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WorkstationWindow } from './windows/WorkstationWindow'
import { FloatingWindow } from './windows/FloatingWindow'
import { BroadcastWindow } from './windows/BroadcastWindow'
import './styles/tokens.css'

const windowName = new URLSearchParams(window.location.search).get('window')
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Renderer root element is missing')
}

createRoot(rootElement).render(
  <StrictMode>
    {windowName === 'floating' ? (
      <FloatingWindow />
    ) : windowName === 'broadcast' ? (
      <BroadcastWindow />
    ) : (
      <WorkstationWindow />
    )}
  </StrictMode>,
)
