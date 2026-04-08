# Petrol Bowl Scoreboard — Project Requirements v3

## 1. Project Overview

An HTML-based live scoreboard web application for the **Petrol Bowl Regional Qualifiers 2025**, an SPE-sponsored university question-and-answer competition. The event takes place in **Buenos Aires, May 14–15**, with teams from across Latin America and the Caribbean.

The scoreboard will be projected on a **large LED backdrop screen** behind the contestants on stage and simultaneously accessible to spectators on their personal devices via a web URL.

In addition to live scoring, the application includes a **participant prospecting system** where event attendees can prospect on match outcomes using a parimutuel odds model, earning points based on dynamic odds. This feature is designed to increase engagement among spectators who are not actively competing. The term "prospect" is used instead of "predict" or "bet" to align with oil and gas industry terminology.

---

## 2. Visual Design

### 2.1 Color Palette (from SPE branding)

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#003B71` | Backgrounds, headers |
| Accent Blue | `#0072CE` | Highlights, active states |
| Gold / Yellow | `#F2A900` | Accents, badges, streaks, CTAs |
| White | `#FFFFFF` | Text, icons, dividers |
| Dark / Black | `#1A1A2E` | Stage backdrop, contrast areas |
| Correct Green | `#00C853` | Correct-answer indicators |
| Incorrect Red | `#FF1744` | Incorrect-answer indicators |

### 2.2 Typography

| Role | Font | Weight |
|------|------|--------|
| Titles / Scores | Myriad Variable Concept | Bold |
| Body / Labels | Stolzl | Bold |

### 2.3 Design Inspiration

The visual style should follow the look of previous Petrol Bowl regional events: a bold, sport-broadcast aesthetic with the Petrol Bowl globe logo, oil derricks, deep blue backgrounds, and clean white typography. Reference the Rio de Janeiro 2025 stage backdrop for layout proportions and tone.

---

## 3. User Roles

### 3.1 Administrator
- Authenticated via username + password (see §10 Authentication).
- Sets up matches: selects teams, game type, number of questions.
- Loads batches of upcoming matches for the prospecting system.
- Can delete individual matches from a batch before they start.
- Operates the live scoring console during matches.
- Can trigger next-match view, tiebreakers, and full resets.
- Can reset the entire database (with confirmation) for testing purposes.

### 3.2 Participant (event attendee)
- Authenticated via a **unique PIN code** distributed at the event.
- On first login, optionally provides their **display name** and **country**.
- Can view upcoming matches and place prospects on match outcomes.
- Can view the prospecting leaderboard and their own point history.
- Cannot access admin functions or modify match data.

### 3.3 Viewer (public)
- No authentication required.
- Connects via URL on any device (phone, tablet, LED screen).
- Sees real-time score updates pushed from the server.
- Can view the prospecting leaderboard (read-only).

---

## 4. Team Data Model

Teams are **pre-configured** before the event (not managed via the admin UI during the tournament). Each team has:

| Property | Description | Example |
|----------|-------------|---------|
| `id` | Unique identifier | `ufrj` |
| `fullName` | Full university name | `Universidade Federal do Rio de Janeiro` |
| `shortName` | Abbreviation | `UFRJ` |
| `city` | City of origin | `Rio de Janeiro` |
| `country` | Country | `Brazil` |
| `countryCode` | ISO 3166-1 alpha-2 | `BR` |
| `logo` | University badge image | `/assets/logos/ufrj.png` |

The `countryCode` is used to render the national flag next to the team name on the scoreboard and all public views.

---

## 5. Match Structure

### 5.1 Match Types

| Stage | Typical Questions |
|-------|-------------------|
| Group Stage | Fewer (e.g. 10–15) |
| Quarterfinals | Medium |
| Semifinals | More |
| Third/Fourth Place | More |
| Grand Final | Most (e.g. 20–25) |
| Tiebreaker | 5 |

The admin selects the **stage label** and **exact number of questions** when setting up each match.

### 5.2 Scoring Rules

- **Correct answer:** +10 points
- **Incorrect answer:** −5 points, opposing team gets a chance to answer the same question
- **Skip:** No team buzzed in; 0 points, move to next question

### 5.3 Question Flow

1. Moderator begins reading a question.
2. A team may buzz in at any point.
3. **If correct** → +10 pts, move to next question.
4. **If incorrect** → −5 pts, moderator re-reads the full question for the opposing team.
   - Opposing team may buzz in or decline.
   - **If they answer correctly** → +10 pts.
   - **If they answer incorrectly** → −5 pts.
   - **If they decline** → question is effectively skipped.
5. **If no team buzzes in** → admin clicks Skip, move to next question.

### 5.4 Match End

- Match ends after the final question is resolved.
- The winner is displayed on screen.
- If scores are tied → **Draw** is announced, and the admin can initiate a **Tiebreaker** (short match, typically 5 questions).

---

## 6. Prospecting System (Match Outcome Predictions)

### 6.1 Purpose

To engage event attendees who are not actively competing. Participants prospect on match outcomes and earn points based on parimutuel odds. A prize is awarded to the participant with the most cumulative points at the end of the tournament. The term **"prospect"** is used throughout the application to align with oil and gas industry language.

### 6.2 PIN Code Authentication

- The organizers **pre-generate a batch of unique PIN codes** before the event (e.g. 200 six-digit PINs).
- PINs are printed and distributed to attendees at check-in.
- A participant enters their PIN on the app to log in.
- On first login, the participant is prompted to optionally enter:
  - **Display name** (free text, does not need to be unique).
  - **Country** (selected from a list).
- The PIN is the **unique key** for all prospecting tracking.

### 6.3 Match Loading and Prospecting Window

1. The **admin loads a batch of upcoming matches** into the system (e.g. all group stage matches for the next round).
2. Once saved, the batch is **locked and cannot be edited**, but individual matches can be **deleted** from the batch before they start (see §7.3 Admin Console).
3. Participants see the list of upcoming matches on their phones and can place prospects.
4. Participants can **change their prospect** on any match as many times as they want **before that match starts**.
5. The moment the admin clicks **"Start Match"** on a specific game:
   - All prospects for that match are **locked** (no more changes allowed).
   - The **odds are frozen** at their current value.
6. When new matches are loaded by the admin, participants should receive a **notification** (in-app banner or indicator) that new matches are available for prospecting.

### 6.4 Odds Calculation (Parimutuel Model)

The odds are calculated dynamically based on the proportion of prospects placed on each team, using a simplified parimutuel model with no house commission.

**Formula:**

```
Total prospects = prospects_on_A + prospects_on_B

Odds for Team A = (Total prospects / prospects_on_A)
Odds for Team B = (Total prospects / prospects_on_B)
```

**Scaled display:** All odds are multiplied by 10 for cleaner numbers. So odds of 1.5 display as **15**, odds of 3.0 display as **30**, etc. This means each participant effectively "stakes" 10 points, and the payout is the displayed number.

**Example:**

| Scenario | Prospects on A | Prospects on B | Odds A (×10) | Odds B (×10) |
|----------|----------------|----------------|-------------|-------------|
| Even split | 50 | 50 | 10 | 10 |
| Slight favorite | 70 | 30 | 14 | 33 |
| Heavy favorite | 90 | 10 | 11 | 100 |

**Live odds** update in real time on the participant's screen as more prospects come in, until the match starts and odds freeze.

### 6.5 Edge Cases

| Scenario | Handling |
|----------|----------|
| All prospects on one team, that team wins | Each winner gets **10 points** (minimum payout, equivalent to getting their stake back) |
| All prospects on one team, the other team wins | No winners exist; no points awarded |
| Only one prospect placed total | Odds are displayed as **10 / 10** (even) until more prospects arrive |
| No prospects placed on a match | No prospects are processed; match proceeds normally |
| Match ends in a draw | All prospects are void; no points awarded or deducted; participants get a notification |

### 6.6 Payout Rules

- Every participant always "stakes" a fixed amount of **10 points** (implicit, not deducted from balance).
- If they prospect correctly, they receive the **frozen odds value** as points (e.g. frozen odds of 33 → they earn 33 points).
- If they prospect incorrectly, they receive **0 points** (no penalty, no deduction).
- All winners of a given match receive the **same payout** regardless of when they placed their prospect.

### 6.7 Leaderboard

- A **cumulative leaderboard** tracks total points earned by each participant across all matches in the tournament.
- The leaderboard displays: rank, display name (or PIN if no name provided), country flag, and total points.
- **Point snapshots** are saved after each match concludes, storing every participant's cumulative total at that moment.
- This enables a **point progression chart** showing how each participant's ranking evolved over the course of the tournament (e.g. "you were 10th after match 3, then jumped to 2nd after match 7").
- The leaderboard is visible to all participants and optionally displayed on the LED screen between matches.

---

## 7. Application Views

### 7.1 Live Match Scoreboard (public + LED screen)

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│                   [Match Stage Label]                    │
│              e.g. "Semifinal - Match 2"                  │
│                                                          │
│  [Flag] [Logo]  TEAM A       XX : YY       TEAM B [Logo] [Flag] │
│                                                          │
│  Team A track:  ● ● ✗ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  │
│  Team B track:  ○ ○ ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  │
│                                                          │
│                   🔥 3-answer streak!                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │████████████████████████████░░░░░░░░░░░│  │
│  │         73% Team A  ←→  27% Team B        │  │
│  │        Odds: 14×          Odds: 37×       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Elements:**

- Team names (short), logos, country flags on each side.
- Large animated score numbers in the center area.
- **Two separate question tracks** — one row for Team A and one row for Team B, each with one icon per question:
  - Empty circle: not yet played
  - Green indicator: that team answered this question correctly
  - Red indicator: that team answered this question incorrectly
  - Gray: skipped (no team buzzed in)
  - Combined states are visible across both tracks (e.g., question 3 shows red on Team A's track and green on Team B's track, meaning A got it wrong and B got the rebuttal correct)
- **Score animations:** number transitions with a flash/pulse effect on update.
- **Streak badge:** appears when a team answers 3+ questions correctly in a row (escalates at 5+ to "On Fire" or similar).
- **Prospecting bar chart:** a horizontal bar chart showing the proportion of prospects for each team, with the frozen odds displayed (e.g. "14×" and "37×"). The bar is split proportionally between Team A's color and Team B's color, making it visually obvious when one team is the heavy favorite. This appears when the match starts (prospects are frozen).
- **Match result overlay** at the end: "Team X Wins!" or "Draw".

### 7.2 Next Match Setup View (public + LED screen)

Displayed between matches to prepare the audience:

- Shows both upcoming teams with logos, flags, names, cities.
- Match stage label (e.g., "Quarterfinal 3").
- Visual countdown or "Coming Up Next" branding.

### 7.3 Admin Console (authenticated)

Used by organizers on a laptop/tablet during the event:

**Match Batch Loading Panel:**
- Create a batch of upcoming matches by selecting teams, stages, and question counts for multiple games at once.
- Once saved, the batch is locked and visible to participants for prospecting.
- View which matches have been loaded and their prospecting status.
- **Delete individual matches** from a batch before they have started (matches that are live or finished cannot be deleted). Deleting a match also removes all associated prospects. Requires confirmation.

**Match Setup Panel:**
- Select the next match to play from the loaded batch.
- Review prospecting stats before starting.
- "Start Match" button (this locks prospects and freezes odds for this match).

**Live Scoring Panel (during match):**

| Button | Action |
|--------|--------|
| ✅ Correct A | Team A answered correctly (+10) |
| ✅ Correct B | Team B answered correctly (+10) |
| ❌ Incorrect A | Team A answered incorrectly (−5), opens rebuttal for B |
| ❌ Incorrect B | Team B answered incorrectly (−5), opens rebuttal for A |
| ⏭ Skip | No buzz-in, move to next question |
| ↩ Undo | Revert last action (full history stack, can undo all the way to start) |
| 🔄 Full Reset | Reset scores to 0–0, clear all question outcomes, restart match |

**Post-Match:**
- Display result.
- Trigger payout calculation for prospects.
- Option to start tiebreaker.
- Save match result to history.
- Proceed to set up next match.

**Database Reset (testing/setup):**
- A **"Reset Entire Database"** button available in the admin settings area.
- Requires a **double confirmation** (e.g. type "RESET" + confirm dialog) to prevent accidental use.
- Deletes all matches, actions, prospects, leaderboard snapshots, and participant data.
- **Preserves:** team configurations (names, logos, cities, countries) and admin accounts.
- Intended for testing and pre-event setup; should not be used during the live event.

### 7.4 Participant Screen (PIN-authenticated, mobile)

The mobile-first interface for event attendees:

**Home / Dashboard:**
- Welcome message with participant's name (or PIN).
- Current total points and leaderboard rank.
- Notification banner when new matches are available for prospecting.

**Upcoming Matches List:**
- All loaded matches that haven't started yet.
- For each match: Team A vs Team B, stage label, logos, flags.
- Current live odds displayed below each match (updating in real time).
- Tap to place or change prospect (select Team A or Team B).
- Visual indicator showing which team they've currently picked.
- Matches that have already started show "Prospects Locked" with the frozen odds.

**Match Detail / Prospect Slip:**
- Team A name, logo, flag, current odds.
- Team B name, logo, flag, current odds.
- Two large buttons: "Prospect Team A" / "Prospect Team B".
- Confirmation of current selection.
- Ability to change selection until the match starts.

**Leaderboard:**
- Full ranked list of all participants by total points.
- Each row: rank, name, country flag, total points.
- Highlight the logged-in participant's position.
- Point progression: ability to see how standings evolved after each completed match.

**My Prospects History:**
- List of all past prospects with outcome (correct/incorrect/void).
- Points earned per match.
- Running total.

### 7.5 Match History View

- List of completed matches with teams, scores, stage, and winner/draw status.
- Prospecting stats: how many prospected A vs B, frozen odds, payout.
- Accessible to admin and participants. Optionally displayed on LED screen.
- No full tournament bracket or standings tracking in v1.

---

## 8. Real-Time Communication

- All connected clients (LED screen, phones, tablets) receive **live updates** as the admin logs actions.
- Technology: **Socket.IO** (WebSocket with automatic fallback to long-polling).
- The admin's actions are the single source of truth; viewers and participants are read-only on match data.
- **Socket.IO rooms/channels:**
  - `match:{id}` — live score updates for a specific match.
  - `odds:{id}` — live odds updates for a specific match (sent to participant screens as prospects come in).
  - `leaderboard` — leaderboard updates after match completion.
  - `notifications` — new match batch availability alerts.

---

## 9. Database Schema

### `teams`

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR PK | e.g. `ufrj` |
| full_name | VARCHAR | |
| short_name | VARCHAR | |
| city | VARCHAR | |
| country | VARCHAR | |
| country_code | CHAR(2) | ISO 3166-1 alpha-2 |
| logo_url | VARCHAR | Path to logo image |

### `matches`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| team_a_id | FK → teams | |
| team_b_id | FK → teams | |
| stage | ENUM | group, quarterfinal, semifinal, third_place, final, tiebreaker |
| total_questions | INT | |
| status | ENUM | setup, live, finished |
| score_a | INT | Default 0 |
| score_b | INT | Default 0 |
| winner_id | FK → teams NULL | NULL if draw |
| is_draw | BOOLEAN | Default false |
| parent_match_id | UUID FK NULL | Links tiebreaker to its parent match |
| batch_id | VARCHAR NULL | Groups matches loaded together |
| prospecting_open | BOOLEAN | Default true; set false when match starts |
| frozen_odds_a | INT NULL | Odds ×10 frozen at match start |
| frozen_odds_b | INT NULL | Odds ×10 frozen at match start |
| frozen_prospects_a | INT NULL | Number of prospects on A at freeze |
| frozen_prospects_b | INT NULL | Number of prospects on B at freeze |
| created_at | TIMESTAMP | |
| finished_at | TIMESTAMP NULL | |

### `actions`

Immutable log of every action taken during a match (supports full undo).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| match_id | FK → matches | |
| sequence | INT | Order within match (1, 2, 3…) |
| question_number | INT | Which question this relates to |
| action_type | ENUM | correct_a, correct_b, incorrect_a, incorrect_b, skip, undo, reset |
| is_undone | BOOLEAN | Default false; set true when undone |
| created_at | TIMESTAMP | |

### `admin_users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| username | VARCHAR UNIQUE | |
| password_hash | VARCHAR | bcrypt or argon2 |

### `participants`

| Column | Type | Notes |
|--------|------|-------|
| pin | VARCHAR(6) PK | Unique PIN code distributed at event |
| display_name | VARCHAR NULL | Optional, set by participant on first login |
| country_code | CHAR(2) NULL | Optional, selected by participant |
| total_points | INT | Default 0; running total |
| created_at | TIMESTAMP | When PIN was generated |
| first_login_at | TIMESTAMP NULL | When participant first used their PIN |

### `prospects`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| pin | FK → participants | |
| match_id | FK → matches | |
| prospected_team_id | FK → teams | Which team they prospect will win |
| is_locked | BOOLEAN | Default false; set true when match starts |
| payout | INT NULL | Points earned; set after match ends (NULL = pending, 0 = wrong) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | Last time prospect was changed |

**Unique constraint:** (`pin`, `match_id`) — one prospect per participant per match.

### `leaderboard_snapshots`

Stores cumulative standings after each completed match for point progression tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| match_id | FK → matches | The match that just finished |
| pin | FK → participants | |
| cumulative_points | INT | Participant's total points at this moment |
| rank | INT | Participant's rank at this moment |
| created_at | TIMESTAMP | |

### Database Reset Behavior

When the admin triggers a full database reset:
- **Deleted:** all rows in `matches`, `actions`, `prospects`, `leaderboard_snapshots`, `participants`.
- **Preserved:** all rows in `teams` and `admin_users`.

---

## 10. Authentication

### 10.1 Admin Authentication

Session-based authentication with simple credentials.

1. **Admin accounts** are pre-created before the event (seeded in database or via CLI).
2. Admin navigates to `/admin/login` and enters username + password.
3. Server validates credentials against hashed password in the `admin_users` table.
4. On success, a **session token** (JWT or server-side session cookie) is issued.
5. All admin API endpoints require a valid session; unauthorized requests are rejected.
6. Sessions expire after a configurable timeout (recommended: 12 hours for event-day use).
7. A single shared admin account is acceptable for v1; multiple accounts are optional.

### 10.2 Participant Authentication

PIN-based authentication with no password.

1. Organizers **pre-generate a batch of unique 6-digit PIN codes** before the event using a CLI command or admin tool.
2. PINs are printed on cards and distributed to attendees at check-in.
3. Participant navigates to the app URL on their phone and enters their PIN.
4. Server validates the PIN exists in the `participants` table.
5. On first login, participant is prompted to optionally enter their **display name** and **country**.
6. A **session cookie** is issued tied to the PIN. Sessions last 24 hours.
7. No password is required — the PIN itself is the credential.
8. PINs are single-use identifiers (one person per PIN), but the system does not enforce physical identity — it trusts that the PIN holder is the rightful user.

---

## 11. Technical Stack (Recommended)

### 11.1 Stack Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React (Vite) | 18+ |
| Backend / API | Node.js + Express | 20 LTS |
| Real-time | Socket.IO (WebSocket with fallback) | 4.x |
| Database | SQLite via better-sqlite3 | — |
| ORM | Drizzle ORM or raw SQL | — |
| Auth | express-session + bcrypt | — |
| Hosting | VPS (e.g. Hostinger) | — |
| Fonts | Self-hosted Myriad Variable Concept + Stolzl | — |
| Flags | flag-icons CSS library or CDN | — |

### 11.2 Reasoning

**Node.js + Express** — A single runtime for both backend and frontend build. Socket.IO is native to Node and handles WebSocket connections with automatic fallback to long-polling, which is critical for reliability on event-day Wi-Fi. The entire app can be a single process serving the API, the admin panel, and the public scoreboard.

**React (Vite)** — The scoreboard needs smooth animations (score transitions, streak badges, flash effects) and reactive state updates pushed via Socket.IO. React handles this well. Vite provides fast builds. The admin console, public scoreboard, and participant prospecting screens can be separate routes in the same React app.

**SQLite** — This is a single-event application with one admin writing and many viewers reading. Even with the prospecting system adding writes from participants, SQLite handles this volume easily (hundreds of concurrent users, not millions). It requires zero configuration, and the entire database is a single file that can be backed up by copying it. No need for a separate database service.

**Socket.IO** — Preferred over raw WebSocket or SSE because it handles reconnections, room-based broadcasting (e.g., push odds updates only to users viewing a specific match, push score updates to all viewers), and works reliably behind reverse proxies.

### 11.3 Deployment

The application can be deployed in whichever way is simplest for the team:

- **Direct Node.js process** on the VPS using `pm2` or `systemd` to keep it running. This is the simplest approach — just clone the repo, `npm install`, `npm run build`, and start the server.
- **Docker container** if the team prefers containerized deployments. A single Dockerfile packages everything (Node.js server + built React frontend + SQLite file).
- **Coolify, CapRover, or similar** if a management UI is desired on the VPS. These tools provide a web dashboard for deployments, SSL via Let's Encrypt, and reverse proxy configuration.

Regardless of method:
- Use a **reverse proxy** (nginx, Caddy, or Traefik) to handle HTTPS and forward WebSocket connections.
- Store the SQLite database in a **persistent directory** (e.g. `/data/pb.db`) that is not overwritten on redeployment.
- Set environment variables: `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PORT`.

### 11.4 Minimum VPS Requirements

- 1 vCPU, 1 GB RAM is sufficient.
- Region: choose a data center close to Buenos Aires (São Paulo or Miami) for lowest latency.

---

## 12. API Endpoints (Summary)

### Admin Endpoints (require admin session)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/matches/batch` | Load a batch of upcoming matches |
| GET | `/api/admin/matches` | List all matches |
| DELETE | `/api/admin/matches/:id` | Delete a match (only if status is `setup`) |
| POST | `/api/admin/matches/:id/start` | Start match (locks prospects, freezes odds) |
| POST | `/api/admin/matches/:id/action` | Log action (correct, incorrect, skip) |
| POST | `/api/admin/matches/:id/undo` | Undo last action |
| POST | `/api/admin/matches/:id/reset` | Full match reset |
| POST | `/api/admin/matches/:id/finish` | End match, calculate payouts |
| POST | `/api/admin/matches/:id/tiebreaker` | Create tiebreaker for a drawn match |
| POST | `/api/admin/pins/generate` | Generate a batch of PIN codes |
| POST | `/api/admin/database/reset` | Reset entire database (requires confirmation token) |

### Participant Endpoints (require PIN session)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/participant/login` | PIN login |
| PUT | `/api/participant/profile` | Update display name and country |
| GET | `/api/participant/matches` | List upcoming matches with current odds |
| POST | `/api/participant/prospect` | Place or update a prospect |
| GET | `/api/participant/prospects` | View own prospect history |
| GET | `/api/participant/leaderboard` | View leaderboard |
| GET | `/api/participant/progression` | View own point progression over time |

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matches/live` | Get current live match state |
| GET | `/api/matches/next` | Get next match info |
| GET | `/api/matches/history` | View completed matches |
| GET | `/api/leaderboard` | View prospecting leaderboard |

---

## 13. Out of Scope (v1)

- Full tournament bracket and standings tracking.
- Public team registration or self-service team management.
- Buzzer hardware integration (admin manually logs who buzzed).
- Video/audio streaming.
- Multi-language UI.
- Time-based prospect multipliers (early prospects earning more than late prospects).
- Point deductions for incorrect prospects.

---

## 14. Assets Required

- Petrol Bowl 2025 logo (provided).
- SPE logo (provided).
- University logos for all participating teams.
- Country flag icons (can use open-source flag icon sets via `countryCode`).
- Fonts: Myriad Variable Concept Bold, Stolzl Bold (must be licensed/self-hosted).
