# 📦 EthicFlow — Final Setup Package

## שתי תיקיות:

### 📁 `project-files/` → נכנס ל-Git
21 קבצים שנכנסים ישירות לתוך ה-Repository.

**מה בפנים:**
```
CLAUDE.md                           ← מוח הפרויקט (Claude Code קורא אותו ראשון)
docs/
  spec.md                          ← אפיון: 16 טבלאות, 27 מסכים, SSO-ready
  progress.md                      ← Sprint tracker (צ'קליסט)
  sprint-log.md                    ← לוג משימות שהושלמו
  work-breakdown.md                ← ~150 משימות אטומיות (6 ספרינטים + Phase 2)
  gantt.md                         ← ציר זמן 22+6 שבועות
  session-startup.md               ← הוראות לתחילת כל session
.claude/
  skills/ (10 skills)
    prisma-schema/                 ← DB conventions + User model SSO-ready
    api-endpoint/                  ← Route + Controller template
    react-component/               ← Component + responsive + i18n
    pluggable-service/             ← Factory pattern (6 services incl Auth)
    i18n-setup/                    ← Translations he/en
    code-review/                   ← סניור ארכיטקט 15 שנים
    qa-senior/                     ← QA סניור — בדיקות מקיפות
    security-audit/                ← בודק חדירות — OWASP Top 10
    accessibility-expert/          ← מומחה נגישות — WCAG 2.2 AA
    ui-ux-designer/                ← 3 אפשרויות עיצוב לפני כל דף
  commands/ (4 commands)
    sprint-plan.md                 ← /sprint-plan — בחר משימה (+ UI gate)
    task-done.md                   ← /task-done — בדיקה מהירה אחרי משימה
    review.md                      ← /review — בדיקת קוד לפני commit
    sprint-end.md                  ← /sprint-end — Pipeline: CR→QA→A11Y→SEC
```

### 📁 `reference-docs/` → לעיון שלך בלבד (לא ב-Git)
8 מסמכי אפיון והדרכה.

---

## 🚀 התחלת עבודה — 5 דקות

### 1. העתק project-files לתוך הפרויקט
```bash
cd C:\EthicFlow
# העתק את כל תוכן project-files/ ישירות לכאן
# (CLAUDE.md, docs/, .claude/)
```

### 2. צור .gitignore
```bash
echo "node_modules/
.env
.env.*
!.env.example
dist/
uploads/
generated/
.DS_Store
*.log" > .gitignore
```

### 3. Commit + Push
```bash
git add .
git commit -m "chore: project setup — CLAUDE.md, 10 skills, 4 commands, docs"
git push
```

### 4. פתח Claude Code והתחל
```bash
claude
```
הקלד:
```
Read @CLAUDE.md and @docs/progress.md then run /sprint-plan
```

**זהו! Claude Code יציג Sprint 1 Task S1.1.1 ויחכה לאישור שלך.** 🎯
