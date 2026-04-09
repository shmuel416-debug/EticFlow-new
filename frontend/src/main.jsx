/**
 * EthicFlow — App Entry Point
 * Bootstraps i18n before rendering. Sets initial HTML dir from stored language.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './services/i18n'  // must import before App to init i18next
import './index.css'
import App from './App.jsx'

// Apply initial direction before first render
const lang = localStorage.getItem('lang') || 'he'
document.documentElement.lang = lang
document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
