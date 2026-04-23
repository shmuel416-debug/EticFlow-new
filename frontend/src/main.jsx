/**
 * EthicFlow — App Entry Point
 * Bootstraps i18n before rendering. Sets initial HTML dir from stored language.
 * Mounts a single AnnounceRegion at the app root for SR live announcements.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './services/i18n'
import './index.css'
import App from './App.jsx'
import AnnounceRegion from './components/ui/AnnounceRegion'

const lang = localStorage.getItem('lang') || 'he'
document.documentElement.lang = lang
document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <AnnounceRegion />
  </StrictMode>,
)
