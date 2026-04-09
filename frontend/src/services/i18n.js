/**
 * EthicFlow — i18n Configuration
 * Hebrew (RTL) is the default language. English (LTR) is secondary.
 * Direction is applied to <html> element by AuthContext on language change.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import he from '../locales/he.json'
import en from '../locales/en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    lng: localStorage.getItem('lang') || 'he',
    fallbackLng: 'he',
    interpolation: { escapeValue: false },
  })

export default i18n
