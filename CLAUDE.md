# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run once at root — installs all workspaces)
npm install

# Initialize database schema
npm run migrate

# Seed demo data (admin user, teams, 500 PIN codes)
npm run seed

# Start development (server + Vite client concurrently)
npm run dev

# Build client for production (outputs to /server/public/)
npm run build

# Start production server (serves built client as static files)
npm start
```

There are no automated tests. The Vite dev server proxies `/api` and `/socket.io` to the Express server at port 3000.

## Architecture

**Monorepo with npm workspaces:** `server/` (Express + SQLite) and `client/` (React + Vite).

**Data flow:**
```
Admin Console → POST /api/admin/* → SQLite update + Socket.IO broadcast → all connected clients update in real time
```

**Three user roles:**
- **Public** (`/`, `/next`, `/prospects`) — no auth; intended for LED screens and spectators
- **Admin** (`/timekeeper/*`) — session-based auth with username/password
- **Participant** (`/p/*`) — PIN-based auth (6-digit codes); for event attendees who place prospects

**Real-time sync:** All live views share a single Socket.IO connection via the `useSocket` hook (`client/src/hooks/useSocket.js`). The server emits events (`match:updated`, `match:started`, `match:finished`) which clients subscribe to by room.

**Database:** SQLite via `better-sqlite3` (synchronous API). Schema is in `server/src/db/schema.sql`. The database file lives at `server/data/pb.db` and is not committed.

**Prospecting system (parimutuel model):** Participants predict match winners. Odds update dynamically (`total_prospects / prospected_for × 10`). When a match finishes, `server/src/lib/payout.js` distributes points and `server/src/lib/odds.js` freezes odds. Prospects lock when a match goes live.

**Scoring:** Matches progress through `setup → live → finished`. Actions (correct, incorrect, skip, undo, reset) are recorded per-question and are reversible. `score_a` / `score_b` are derived from the actions log.

**Client build:** Vite builds to `server/public/`; the Express server serves this directory as static files and falls back to `index.html` for all non-API routes (SPA routing).

## Key Files

| File | Purpose |
|------|---------|
| `server/src/index.js` | Express app, Socket.IO setup, middleware registration |
| `server/src/db/schema.sql` | All table definitions |
| `server/src/routes/admin.js` | Admin API — match control, scoring actions |
| `server/src/routes/participant.js` | Participant API — prospects, leaderboard |
| `server/src/lib/odds.js` | Parimutuel odds calculation |
| `server/src/lib/payout.js` | Post-match payout distribution |
| `client/src/App.jsx` | Route definitions and `<AdminRoute>` / `<ParticipantRoute>` guards |
| `client/src/hooks/useSocket.js` | Singleton Socket.IO instance shared across views |
| `client/src/views/AdminConsole.jsx` | Admin control panel |
| `client/src/views/Scoreboard.jsx` | Main live scoreboard |
| `vite.config.js` | Vite build config — outDir and dev proxy |

## Environment

Copy `.env.example` to `.env` in the `server/` directory. Key variables:
- `SESSION_SECRET` — must be changed before any public deployment
- `ADMIN_PASSWORD` — hashed by the seed script; change before production
- `PORT` — defaults to 3000
