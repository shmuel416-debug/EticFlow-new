---
name: i18n-setup
description: Use when adding translations, creating new pages, or working with multilingual text
---

# i18n (Internationalization) Pattern

## Setup
- Library: `react-i18next` + `i18next`
- Default language: Hebrew (he)
- Supported: Hebrew (he, RTL), English (en, LTR)
- Language switcher: toggle button in Header component
- Language persisted in localStorage

## File Structure
```
frontend/src/
  locales/
    he.json       → Hebrew translations (default)
    en.json       → English translations
  i18n.js         → i18next configuration
```

## Translation Key Convention
```json
{
  "common": {
    "save": "שמור",
    "cancel": "ביטול",
    "delete": "מחק",
    "loading": "טוען...",
    "error": "שגיאה",
    "success": "הפעולה בוצעה בהצלחה",
    "noData": "אין נתונים להצגה",
    "search": "חיפוש..."
  },
  "auth": {
    "login": "התחברות",
    "email": "כתובת מייל",
    "password": "סיסמה"
  },
  "researcher": {
    "dashboard": {
      "title": "המחקרים שלי",
      "newSubmission": "הגשת בקשה חדשה"
    }
  }
}
```

## Usage in Components
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  // Simple text
  <h1>{t('researcher.dashboard.title')}</h1>
  
  // With variables
  <p>{t('common.showing', { count: 5 })}</p>
  
  // Change language
  <button onClick={() => i18n.changeLanguage('en')}>EN</button>
}
```

## Direction Handling
```jsx
// In App.jsx or Layout — auto-switches dir based on language
const { i18n } = useTranslation();
const dir = i18n.language === 'he' ? 'rtl' : 'ltr';

<html dir={dir} lang={i18n.language}>
```

## Rules
- EVERY new page: add keys to BOTH he.json and en.json
- Key naming: `<section>.<page>.<element>` — e.g. `secretary.meetings.addButton`
- Common strings (save, cancel, error): use `common.*` namespace
- Dates: format with date-fns locale — `he` or `enUS`
- Numbers: use `Intl.NumberFormat` with correct locale
- Backend errors: return code string, frontend maps to translated message
