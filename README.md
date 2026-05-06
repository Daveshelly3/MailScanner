# MailScanner

AI-powered Outlook inbox triage. Scans Microsoft 365 email and surfaces unanswered client questions, feedback, and action items — ranked by urgency.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Vite |
| Backend | Node.js + Express |
| Auth | Microsoft OAuth 2.0 via MSAL Node |
| Email access | Microsoft Graph API |
| AI | Anthropic API — `claude-sonnet-4-20250514` |
| Database | PostgreSQL via Prisma ORM |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Microsoft Azure app registration with `Mail.Read` and `User.Read` scopes
- Anthropic API key

## Quick start (local)

### 1. Start the database

```bash
docker compose up db -d
```

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

Required variables:

| Variable | Description |
|----------|-------------|
| `AZURE_CLIENT_ID` | Azure app registration client ID |
| `AZURE_CLIENT_SECRET` | Azure app registration client secret |
| `AZURE_TENANT_ID` | `common` for multi-tenant, or your tenant ID |
| `AZURE_REDIRECT_URI` | `http://localhost:3001/auth/callback` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SESSION_SECRET` | Long random string for session signing |
| `DATABASE_URL` | PostgreSQL connection string |

### 3. Install and migrate

```bash
cd backend && npm install
npx prisma db push
cd ../frontend && npm install
```

### 4. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

## Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations → New registration
2. Set redirect URI: `http://localhost:3001/auth/callback` (Web platform)
3. Under API permissions, add: `Mail.Read`, `User.Read` (Delegated)
4. Create a client secret under Certificates & secrets

## Docker (full stack)

```bash
cp backend/.env.example backend/.env
# Fill in credentials in backend/.env
docker compose up --build
```

## Features

- Microsoft 365 OAuth 2.0 sign-in (read-only `Mail.Read` scope)
- Time-window scanning: 6 hrs to all-time
- Folder selection: Inbox, All Mail, Flagged
- AI intent classification: Question / Feedback / Action Required / Complaint
- Priority scoring: Urgent / Medium / Low
- Per-email AI insight and reply opener suggestion
- Quick actions: Draft reply, Summarise thread, Advise me
- Scan history (last 10 scans)
- Rate limited: 10 scans per user per hour

## Project structure

```
MailScanner/
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.js              # Express server entry point
│       ├── config/msal.js        # MSAL configuration
│       ├── middleware/auth.js    # Session auth + token refresh
│       ├── routes/
│       │   ├── auth.js           # OAuth login/callback/logout
│       │   ├── scan.js           # Email scan endpoint
│       │   └── actions.js        # Draft reply / summarise / advise
│       └── services/
│           ├── db.js             # Prisma client
│           ├── graphService.js   # Microsoft Graph API
│           └── aiService.js      # Anthropic Claude integration
└── frontend/
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── Login.jsx
        │   └── Dashboard.jsx
        ├── components/
        │   ├── Layout.jsx
        │   ├── ScanControls.jsx
        │   ├── SummaryStats.jsx
        │   ├── EmailCard.jsx
        │   ├── IntentBadge.jsx
        │   ├── PriorityBadge.jsx
        │   ├── ReplyComposer.jsx
        │   ├── ThreadSummary.jsx
        │   └── AdvicePanel.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   └── useScan.js
        └── services/api.js
```
