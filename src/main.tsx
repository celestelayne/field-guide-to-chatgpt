import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './field-map/field-map.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
