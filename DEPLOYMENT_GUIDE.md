# PetroBowl Scoreboard — Complete Deployment Guide
## From Zero to Live: GitHub + Hostinger VPS + Coolify

**What we're building:**
```
Your code (this folder)
    → pushed to GitHub
    → Coolify watches GitHub for changes
    → Coolify builds a Docker container on Hostinger VPS
    → Traefik (built into Coolify) handles HTTPS + routing
    → Live at https://your-domain.com
```

**Files created alongside this guide:**
- `Dockerfile` — tells Docker how to build the app
- `.dockerignore` — tells Docker what to skip
- `.github/workflows/deploy.yml` — GitHub Action that pings Coolify on every push

---

## PART 1 — GitHub Setup

### Step 1.1 — Create a GitHub Account

1. Go to **https://github.com**
2. Click **Sign up**
3. Enter your email address, create a password, and choose a username
   - Your username will appear in URLs like `github.com/yourusername/petrobowl-scoreboard`
4. Verify your email address when GitHub sends you a confirmation email
5. On the "Welcome" screen, you can skip the personalization steps

---

### Step 1.2 — Install Git on Windows

Git is the tool that sends your code to GitHub.

1. Go to **https://git-scm.com/download/win**
2. Download the **64-bit Git for Windows Setup** installer
3. Run the installer — accept all defaults (click Next through everything)
4. After install, open **Git Bash** from the Start Menu
5. Confirm it works:
   ```
   git --version
   ```
   You should see something like `git version 2.44.0.windows.1`

---

### Step 1.3 — Configure Git with Your Identity

In Git Bash (or any terminal):
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```
Use the same email you registered on GitHub.

---

### Step 1.4 — Create a New Repository on GitHub

1. On GitHub, click the **+** icon (top right) → **New repository**
2. Fill in:
   - **Repository name:** `petrobowl-scoreboard`
   - **Description:** PetroBowl live scoreboard web application
   - **Visibility:** Private (recommended — keeps your code private)
   - Leave all checkboxes **unchecked** (no README, no .gitignore — the project already has these)
3. Click **Create repository**
4. GitHub shows a page with setup instructions — **copy the repository URL**, it looks like:
   ```
   https://github.com/yourusername/petrobowl-scoreboard.git
   ```

---

### Step 1.5 — Push the Existing Project to GitHub

The code already lives in this folder. We need to connect it to GitHub and push it.

Open a terminal in the project folder (`C:\Users\T-Gamer\Documents\08 Petrobowl\07_Scoreboard`).

- **VS Code:** Terminal → New Terminal
- **Git Bash:** right-click inside the folder → Git Bash Here

Run these commands one by one:

```bash
# 1. Confirm you're in the right folder
pwd
# Expected: /c/Users/T-Gamer/Documents/08 Petrobowl/07_Scoreboard

# 2. Check the existing git status
git status

# 3. Connect this local repo to GitHub (use YOUR actual URL)
git remote add origin https://github.com/yourusername/petrobowl-scoreboard.git

# 4. Rename the local branch to 'main' (GitHub's default)
git branch -M main

# 5. Push all existing code to GitHub
git push -u origin main
```

When prompted, enter your GitHub username and password.

> **If Git fails with "authentication failed":** GitHub no longer accepts plain passwords. Create a **Personal Access Token** instead:
> 1. GitHub → avatar (top right) → Settings
> 2. Left sidebar → Developer settings → Personal access tokens → Tokens (classic)
> 3. Generate new token → name it `petrobowl-push`, expiration 90 days
> 4. Check the **repo** checkbox
> 5. Click Generate token → copy it
> 6. Use this token as your "password" when Git prompts you

After `git push`, refresh your GitHub repository page — you should see all the project files.

---

## PART 2 — Add Deployment Files to the Project

Three files are already created in this repo (alongside this guide):
- `Dockerfile`
- `.dockerignore`
- `.github/workflows/deploy.yml`

Push them to GitHub:

```bash
git add Dockerfile .dockerignore .github/workflows/deploy.yml DEPLOYMENT_GUIDE.md
git commit -m "Add Docker and CI/CD deployment configuration"
git push origin main
```

Go to GitHub → **Actions** tab. The workflow will run and fail at the last step (no Coolify webhook yet — that's expected, we'll fix it in Part 4).

---

## PART 3 — Hostinger VPS Setup

### Step 3.1 — Purchase a Hostinger VPS with Coolify Pre-installed

Hostinger offers VPS plans with Coolify already set up — use this instead of a plain Ubuntu VPS to skip the manual installation entirely.

1. Go to **https://www.hostinger.com/vps-hosting**
2. Recommended plan: **KVM 2** or higher
   - 2 vCPU, 8 GB RAM, 100 GB SSD
   - The app needs ~1 GB RAM but Coolify itself needs ~2 GB for its own services
   - KVM 1 (4 GB RAM) may work but is tight
3. Select datacenter region: **São Paulo** (closest to Buenos Aires) or **Miami**
4. **Operating system / Panel:** Look for the **Coolify** option in the OS or application panel selector
   - On Hostinger this is usually under **Operating System** → **Applications** → **Coolify**
   - This installs Ubuntu with Docker and Coolify already running — no manual setup needed
5. Complete the purchase

---

### Step 3.2 — Get Your VPS Login Credentials

After purchase:
1. Go to **hPanel** → **VPS** section
2. Find your VPS → click **Manage**
3. Note your **IP address** (e.g. `45.67.89.10`)
4. The root password was shown during setup or emailed to you
5. If you need to reset: VPS dashboard → **OS & Panel** → **Change root password**

---

### Step 3.3 — Configure Hostinger Firewall

1. VPS → **Manage** → **Firewall** (or **Security**)
2. Make sure these rules exist (create them if they don't):

   | Port | Protocol | Allow from |
   |------|----------|------------|
   | 22 | TCP | All (or your IP only for more security) |
   | 80 | TCP | All |
   | 443 | TCP | All |
   | 8000 | TCP | Your IP only (Coolify UI — restrict after setup) |

3. Save changes

---

### Step 3.4 — Connect to Your VPS via SSH

**Using Windows PowerShell:**
```powershell
ssh root@YOUR_VPS_IP
```
Type `yes` when asked about the fingerprint. Enter your root password.

You are now inside the server — prompt looks like `root@vps:~#`.

---

### Step 3.5 — Update the Server (Optional)

```bash
apt update && apt upgrade -y
```

This is optional — the Coolify image from Hostinger ships with reasonably up-to-date packages. Skip if you want to go straight to the Coolify setup.

---

## PART 4 — Configure Coolify

> Since you selected the Coolify VPS option on Hostinger, Docker and Coolify are already installed and running. Skip straight to Step 4.2 — no manual installation needed.

### Step 4.1 — (Skipped) Coolify is Pre-installed

Coolify is already running on your VPS. Access it at: `http://YOUR_VPS_IP:8000`

---

### Step 4.2 — Coolify Initial Setup

1. Open `http://YOUR_VPS_IP:8000` in your browser
2. You'll see a **registration page** — create your Coolify admin account (email + password)
   - If Hostinger already registered an account for you, use the credentials shown in hPanel
3. On the server setup screen:
   - Click **Let's start!**
   - Select **localhost**
   - Click **Continue**
4. Coolify validates the connection → shows "Connected ✓"

---

### Step 4.3 — Connect GitHub to Coolify

1. Coolify dashboard → **Sources** → **Add** → **GitHub App**
2. Click **Register Now on GitHub**
   - GitHub opens and asks you to create a GitHub App for Coolify
   - Name it something like `coolify-petrobowl` (must be unique on GitHub)
   - Click **Create GitHub App**
3. GitHub redirects back to Coolify
4. In Coolify → **Sources** → click your new GitHub App → **Install Repositories**
   - A GitHub popup appears
   - Select **Only select repositories** → choose `petrobowl-scoreboard`
   - Click **Install & Authorize**
5. Back in Coolify — source shows **Connected**

---

### Step 4.4 — Create a New Project

1. Coolify → **Projects** → **+ Add** → **New Project**
2. Name it: `PetroBowl`
3. Click **Create**
4. Click **+ Add New Resource** → **Application**

---

### Step 4.5 — Configure the Application Source

1. **Source:** GitHub → select your GitHub App
2. **Repository:** `yourusername/petrobowl-scoreboard`
3. **Branch:** `main`
4. Click **Continue**

---

### Step 4.6 — Configure Build Settings

1. **Build Pack:** **Dockerfile** (not Nixpacks, not Docker Compose)
2. **Dockerfile Location:** `/Dockerfile` (default — leave as is)
3. **Port:** `3000`
4. **Base Directory:** `/` (default)
5. Click **Save**

---

### Step 4.7 — Set Environment Variables

Application settings → **Environment Variables** → **+ Add** for each:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Should not be available at buildtime. Only at runtime |
| `PORT` | `3000` | |
| `SESSION_SECRET` | *(generate below)* | Long random string |
| `ADMIN_PASSWORD` | *(your chosen password)* | Admin login password |

**Generate SESSION_SECRET** in your SSH terminal:
```bash
openssl rand -hex 32
```
Copy the 64-character output and paste it as the value.

Click **Save**.

---

### Step 4.8 — Mount a Persistent Volume for the Database

**This is the most important step.** Without it the database is wiped on every redeploy.

Application settings → **Storages** (or **Volumes**) → **+ Add Volume**:

- **Source:** leave blank (Coolify auto-creates a named Docker volume)
- **Destination (container path):** `/app/server/data`

Click **Save**.

Every deploy mounts the same volume here, so `pb.db` survives across all updates.

---

### Step 4.9 — Configure Your Domain

**You need a domain name.** Options:
- A domain you already own
- Buy one from Hostinger (hPanel → Domains)
- A free option like `afraid.org` for testing

**DNS setup** (in your domain registrar's DNS zone):
- Type: **A record**
- Host/Name: `scoreboard` (or `@` for root domain)
- Points to: `YOUR_VPS_IP`
- TTL: 300

Wait 5–30 minutes for DNS to propagate.

**In Coolify:** Application settings → **Domains** → update name with all domains separated by commas:
- Enter: https://petrobowl.online, https://www.petrobowl.online 
  (include `https://` — this triggers Let's Encrypt SSL)
- Click **Save**

Coolify's built-in Traefik handles SSL automatically. No nginx config needed.

---

### Step 4.10 — Enable Auto-Deploy and Get the Webhook URL

1. Application settings → **Advanced** → **Auto Deploy** → toggle **ON**
2. Find the **Webhook** URL — looks like:
   ```
   http://YOUR_VPS_IP:8000/webhooks/deploy?uuid=abc123&token=xyz789
   ```
3. **Copy this entire URL**

---

### Step 4.11 — Add Webhook URL to GitHub Secrets

1. GitHub → your repo → **Settings**
2. Left sidebar → **Secrets and variables** → **Actions**
3. **New repository secret**:
   - Name: `COOLIFY_WEBHOOK_URL`
   - Secret: paste the full webhook URL from Coolify
4. Click **Add secret**

---

## PART 5 — First Deploy

### Step 5.1 — Trigger the First Deploy

1. Coolify → your application → **Deploy** button
2. A build log appears — watch it

**Expected log output:**
```
[builder] npm ci — installing all deps
[builder] npm run build — compiling React → server/public/
[runner] npm ci --omit=dev — production deps only
[runner] Copying server source + built client
Container starting...
node server/src/db/migrate.js → "Migration complete → /app/server/data/pb.db"
node server/src/index.js → "PetroBowl server running on http://localhost:3000"
```

Takes ~3–5 minutes. If it fails, read the error in the log.

**Common build errors:**

| Error | Fix |
|---|---|
| `COPY client/public` fails | Make sure `client/public/assets/logos/` is committed to GitHub |
| `npm ci` fails | Make sure `package-lock.json` is committed to GitHub |
| `better-sqlite3` compile error | Make sure `node_modules/` is in `.dockerignore` |

---

### Step 5.2 — Seed the Database (Run Once)

After the first successful deploy, populate teams and generate 500 PIN codes.

**Via Coolify Terminal** (application → Terminal tab):
```bash
node server/src/db/seed.js
```

```bash
node server/src/db/seed.snapshot.js
```

**Via SSH on the VPS:**
```bash
ssh root@YOUR_VPS_IP

# Find the container
docker ps
# Look for a container with "petrobowl" in the name

# Run seed inside it
docker exec -it CONTAINER_ID node server/src/db/seed.js
```

The seed script is safe to run multiple times (uses `INSERT OR IGNORE`).

**Export PIN codes** for printing:
```bash
docker exec -it CONTAINER_ID ls server/data/
docker exec -it CONTAINER_ID cat server/data/pins_TIMESTAMP.txt
```

---

## PART 6 — Verify Everything Works

### Step 6.1 — Test the Live App

| URL | Expected |
|---|---|
| `https://petrobowl.online` | Landing page loads |
| `https://petrobowl.online/timekeeper/login` | Admin login page |
| `https://petrobowl.online/p/login` | Participant PIN login |

Admin login:
- Username: `admin`
- Password: what you set as `ADMIN_PASSWORD` in Coolify

---

### Step 6.2 — Test Real-Time Updates (WebSocket)

1. Open the scoreboard in **two browser windows**
2. Log in as admin in one window, create and start a match
3. Click **Correct A** — score updates instantly in the other window

If real-time updates don't work, open browser DevTools (F12 → Console) and look for WebSocket errors.

---

### Step 6.3 — Test Auto-Deploy

Make a small change, push it, and watch it go live:

```bash
# Edit any file, e.g. add a space to client/src/views/Landing.jsx
git add -A
git commit -m "Test auto-deploy"
git push origin main
```

1. GitHub → **Actions** tab — watch the workflow (~2 min)
2. After it passes, Coolify starts a new deploy automatically
3. After ~5 min total, the change is live

---

## PART 7 — Day-to-Day Usage

### Pushing Updates

```bash
# Make changes locally, test with: npm run dev

# Push when ready
git add -A
git commit -m "Description of change"
git push origin main
# → GitHub Actions → Coolify redeploys → live in ~5 min
```

### Admin Panel

URL: `https://scoreboard.yourdomain.com/timekeeper/login`

> Sessions reset on every redeploy — log in again after each push.

### Backing Up the Database

```bash
# On the VPS — copy db inside the container's volume
docker exec -it CONTAINER_ID sh -c \
  "cp /app/server/data/pb.db /app/server/data/pb_backup_\$(date +%Y%m%d).db"

# Copy to your local machine (run on your Windows machine, not the VPS)
scp root@YOUR_VPS_IP:/var/lib/docker/volumes/VOLUME_NAME/_data/pb.db ./pb_backup.db
# Find VOLUME_NAME with: docker volume ls (on the VPS)
```

---

## PART 8 — Troubleshooting

### 502 Bad Gateway

```bash
ssh root@YOUR_VPS_IP
docker ps                          # is the container running?
docker logs CONTAINER_ID --tail 50 # read crash logs
```

### Build Fails in Coolify

Coolify → application → **Deployments** → click the failed deploy → read full log.

| Symptom | Likely cause |
|---|---|
| `better-sqlite3` fails to compile | `node_modules/` not in `.dockerignore` |
| `COPY` command fails | File not committed to GitHub |
| `npm ci` fails | `package-lock.json` not committed |

### WebSocket Not Connecting

1. Check browser console (F12) for errors
2. Make sure the domain uses `https://` in Coolify settings
3. Try adding env var `WS_PROXY=true` in Coolify

### SSL Certificate Not Issued

1. DNS A record must point to VPS IP before Let's Encrypt works
2. Wait 10–30 min after DNS change
3. Coolify → application → Domains → **Renew Certificate**

---

## Quick Reference

### SSH Commands (run on VPS)

```bash
docker ps                                    # list running containers
docker logs CONTAINER_ID --follow            # live log stream
docker exec -it CONTAINER_ID node server/src/db/seed.js   # run seed
docker restart CONTAINER_ID                  # manual restart
docker volume ls                             # list volumes (find DB volume)
df -h                                        # check disk space
```

### Important URLs

| URL | Purpose |
|---|---|
| `http://YOUR_VPS_IP:8000` | Coolify admin dashboard |
| `https://scoreboard.yourdomain.com` | Live app |
| `https://scoreboard.yourdomain.com/timekeeper/login` | Admin console |
| `https://scoreboard.yourdomain.com/p/login` | Participant login |
| `https://github.com/yourusername/petrobowl-scoreboard/actions` | CI/CD runs |

### Pre-Event Day Checklist

```
[ ] App loads at HTTPS URL
[ ] Admin login works (username: admin)
[ ] Participant PIN login works
[ ] Real-time updates work (test with two windows)
[ ] Team logos visible on scoreboard
[ ] PIN codes generated and printed
[ ] Database backed up
[ ] ADMIN_PASSWORD is not "admin123"
[ ] SESSION_SECRET is a real random value (not the placeholder)
```

---

## PART 9 — Resetting the Database Between Tournaments

Use this when you want to wipe all match history, scores, bets, and participant profiles — but keep the team list and all 500 PINs intact. This is the clean slate for a new tournament day.

### What gets wiped
- All matches and scoring actions
- All prospects (bets)
- All leaderboard snapshots
- All bracket and draw assignments
- All participant display names, country flags, and points

### What is preserved
- All team names and details
- All 500 PIN codes (participants can log in again with the same PIN)
- The admin user and password

---

### Option A — Via Coolify Terminal (easiest, no SSH needed)

1. Go to your Coolify dashboard → **PetroBowl** project → your application
2. Click the **Terminal** tab (opens a shell inside the running container)
3. Run:
   ```bash
   node server/src/db/seed.clean.js
   ```
4. You should see:
   ```
   Tables cleared.
   Teams: 21 inserted
   Admin user: seeded
   Participants: 500 PINs added
   Snapshot seed complete → /app/server/data/pb.db
   ```
5. Done — the app is live immediately with a fresh database. No restart needed.

---

### After the reset — verify

| Check | How |
|---|---|
| Leaderboard is empty | Visit `https://petrobowl.online/leaderboard` |
| No matches listed | Visit `https://petrobowl.online/matches` |
| PINs still work | Go to `https://petrobowl.online/p/login`, enter any old PIN |
| Admin login works | Go to `https://petrobowl.online/timekeeper/login` |

---

*Guide prepared for PetroBowl Scoreboard v1 — Buenos Aires Regional 2025*
