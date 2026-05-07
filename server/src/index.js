require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set')
  process.exit(1)
}

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const session    = require('express-session')
const rateLimit  = require('express-rate-limit')
const path       = require('path')

const authRoutes        = require('./routes/auth')
const adminRoutes       = require('./routes/admin')
const participantRoutes = require('./routes/participant')
const publicRoutes      = require('./routes/public')
const tablesRoutes      = require('./routes/tables')
const drawRoutes        = require('./routes/draw')
const db                = require('./db/db')
const { calcOdds }      = require('./lib/odds')

const app    = express()
app.set('trust proxy', 1)
const server = http.createServer(app)
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})

// ── Session store ──────────────────────────────────────────────────────────
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 h
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
})

app.use(express.json())
app.use(sessionMiddleware)

// Share session with Socket.IO
io.engine.use(sessionMiddleware)

// Attach io instance to every request so routes can emit events
app.use((req, _res, next) => {
  req.io = io
  next()
})

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/admin/login', loginLimiter)
app.use('/api/participant/login', loginLimiter)
app.use('/api', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/participant', participantRoutes)
app.use('/api', publicRoutes)
app.use('/api', tablesRoutes)
app.use('/api', drawRoutes.publicRouter)
app.use('/api/admin', drawRoutes.adminRouter)

// ── Serve built React app (production) ────────────────────────────────────
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const fs = require('fs')
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR))
  // SPA fallback — send index.html for any non-API route
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
  })
}

// ── Socket.IO ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_match', (matchId) => socket.join(`match:${matchId}`))
  socket.on('join_odds', (matchId) => {
    socket.join(`odds:${matchId}`)
    // Immediately send current vote counts so the client has the latest state on join
    try {
      const match = db.prepare('SELECT team_a_id, team_b_id FROM matches WHERE id = ?').get(matchId)
      if (match) {
        const counts = db.prepare(`
          SELECT
            SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_a,
            SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_b
          FROM prospects WHERE match_id = ?
        `).get(match.team_a_id, match.team_b_id, matchId)
        const votes_a = counts.cnt_a || 0
        const votes_b = counts.cnt_b || 0
        const { oddsA, oddsB } = calcOdds(votes_a, votes_b)
        socket.emit('odds_update', { match_id: matchId, oddsA, oddsB, votes_a, votes_b })
      }
    } catch (_) { /* non-fatal — client will still get live updates */ }
  })
  socket.on('leave_match', (matchId) => socket.leave(`match:${matchId}`))
  socket.on('leave_odds',  (matchId) => socket.leave(`odds:${matchId}`))
  socket.on('join_draw',  () => socket.join('draw'))
  socket.on('leave_draw', () => socket.leave('draw'))
})

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`PetroBowl server running on http://localhost:${PORT}`)
})
