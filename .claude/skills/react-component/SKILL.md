---
name: react-component
description: Use when creating React pages or components for the frontend
---

# React Component Pattern

## File Naming
- Components: PascalCase → `LoginPage.jsx`, `SLABadge.jsx`
- Hooks: camelCase with use prefix → `useAuth.js`, `useSubmissions.js`
- Services: camelCase → `authService.js`, `submissionService.js`

## Component Template
```jsx
/**
 * <ComponentName> — <one-line description>
 * @module pages/<role>/<ComponentName>
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ComponentName() {
  const { t } = useTranslation();

  return (
    <div className="px-4 md:px-6 lg:px-8">
      <h1 className="text-xl md:text-2xl font-bold">
        {t('page.title')}
      </h1>
    </div>
  );
}
```

## Rules
- Functional components ONLY — no class components
- ALL user-facing text via `t('key')` — NEVER hardcode strings
- TailwindCSS for all styling — no CSS files
- Mobile-first: default styles = mobile, `md:` = tablet, `lg:` = desktop
- Extract reusable logic into custom hooks
- API calls go in services/ — not in components
- Loading states: show skeleton/spinner
- Error states: show user-friendly translated message
- Empty states: show helpful translated message
- Max 150 lines per component — extract sub-components if longer
- Sidebar: `hidden md:block` for desktop, drawer for mobile
- Tables: card layout on mobile (`block md:table`)
- Touch targets: minimum 44x44px (`min-h-[44px] min-w-[44px]`)
