require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const session    = require('express-session')
const path       = require('path')

const authRoutes        = require('./routes/auth')
const adminRoutes       = require('./routes/admin')
const participantRoutes = require('./routes/participant')
const publicRoutes      = require('./routes/public')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: '*', credentials: true },
})

// ── Session store ──────────────────────────────────────────────────────────
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 h
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
app.use('/api', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/participant', participantRoutes)
app.use('/api', publicRoutes)

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
  socket.on('join_odds',  (matchId) => socket.join(`odds:${matchId}`))
  socket.on('leave_match', (matchId) => socket.leave(`match:${matchId}`))
  socket.on('leave_odds',  (matchId) => socket.leave(`odds:${matchId}`))
})

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`PetroBowl server running on http://localhost:${PORT}`)
})
