/**
 * Ethic-Net — App Entry Point
 * Bootstraps i18n before rendering. Sets initial HTML dir from stored language.
 * Mounts a single AnnounceRegion at the app root for SR live announcements.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import i18n from './services/i18n'
import { applyDefaultDocumentTitle } from './utils/documentTitle'
import './index.css'
import App from './App.jsx'
import AnnounceRegion from './components/ui/AnnounceRegion'
import levLogo from './assets/LOGO.jpg'

const lang = localStorage.getItem('lang') || 'he'
document.documentElement.lang = lang
document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'

/**
 * Updates tab title and favicon from i18n/brand assets.
 * @returns {void}
 */
function updateBrowserBranding() {
  applyDefaultDocumentTitle()
}

updateBrowserBranding()
i18n.on('languageChanged', (nextLang) => {
  document.documentElement.lang = nextLang
  document.documentElement.dir = nextLang === 'he' ? 'rtl' : 'ltr'
  updateBrowserBranding()
})

const faviconElement = document.querySelector("link[rel~='icon']")
if (faviconElement) {
  faviconElement.href = levLogo
} else {
  const newFavicon = document.createElement('link')
  newFavicon.rel = 'icon'
  newFavicon.href = levLogo
  document.head.appendChild(newFavicon)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <AnnounceRegion />
  </StrictMode>,
)
