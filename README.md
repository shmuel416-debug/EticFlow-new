# 📦 EthicFlow — Complete Project Package

## What's Inside

```
EthicFlow-Ready/
├── CLAUDE.md                      ← Claude Code instructions
├── .gitignore                     ← Git ignore rules
├── .env.example                   ← All environment variables (template)
├── setup.sh                       ← Interactive setup wizard for new institutions
├── docker-compose.yml             ← Base: PostgreSQL
├── docker-compose.dev.yml         ← DEV: + pgAdmin
├── docker-compose.prod.yml        ← PROD: + Backend + Frontend containers
│
├── docs/                          ← Project documentation
│   ├── spec.md                    ← Specification (16 tables, 27 screens)
│   ├── work-breakdown.md          ← ~150 atomic tasks
│   ├── progress.md                ← Sprint tracker
│   ├── gantt.md                   ← Timeline (22+6 weeks)
│   ├── sprint-log.md              ← Completed tasks log
│   ├── session-startup.md         ← Claude Code session instructions
│   ├── DEPLOYMENT.md              ← Production deployment guide
│   └── NEW_INSTITUTION.md         ← Guide for new institution setup
│
├── .claude/                       ← Claude Code config
│   ├── skills/ (10)               ← Loaded on demand
│   │   ├── prisma-schema/         ← DB conventions + SSO-ready User model
│   │   ├── api-endpoint/          ← Route + Controller template
│   │   ├── react-component/       ← Component + responsive + i18n
│   │   ├── pluggable-service/     ← Factory pattern (6 services)
│   │   ├── i18n-setup/            ← Translation he/en
│   │   ├── code-review/           ← Senior architect (15yr)
│   │   ├── qa-senior/             ← Senior QA testing
│   │   ├── security-audit/        ← Penetration testing (OWASP)
│   │   ├── accessibility-expert/  ← WCAG 2.2 AA + Israeli law
│   │   └── ui-ux-designer/        ← 3 HTML design options per page
│   └── commands/ (4)
│       ├── sprint-plan.md         ← Pick next task + UI gate
│       ├── task-done.md           ← Quick check after each task
│       ├── review.md              ← Code review before commit
│       └── sprint-end.md          ← Full pipeline: CR→QA→A11Y→SEC
│
└── reference-docs/                ← For your reading (NOT in Git)
    ├── EthicFlow-Spec-V2.docx     ← Full Word specification
    ├── 01-diagrams.html           ← 8 diagrams (workflow, ERD, architecture)
    ├── 02-file-structure.html     ← Complete file tree
    ├── 03-screens-27.html         ← All 27 screens (desktop + mobile)
    ├── 04-committee.html          ← Committee management module
    ├── 05-emails-18.html          ← 18 email types + templates
    ├── 06-dev-setup.html          ← Dev environment setup guide
    └── 07-github.html             ← Git/GitHub guide
```

## 🚀 Get Started in 5 Minutes

### 1. Copy everything EXCEPT reference-docs/ into your Git repo
```bash
cd C:\EthicFlow
# Copy: CLAUDE.md, .gitignore, .env.example, setup.sh,
#        docker-compose*.yml, docs/, .claude/
# Keep reference-docs/ separately on your computer
```

### 2. First commit
```bash
git add .
git commit -m "chore: project setup — full infrastructure"
git push
```

### 3. Start development
```bash
# Option A: Setup wizard (recommended first time)
chmod +x setup.sh
./setup.sh

# Option B: Manual
cp .env.example .env
# Edit .env with your values
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 4. Open Claude Code
```bash
claude
> Read @CLAUDE.md and @docs/progress.md then run /sprint-plan
```

**Sprint 1 Task S1.1.1 starts. Happy coding!** 🎯
