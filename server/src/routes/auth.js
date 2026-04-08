const express = require('express')
const bcrypt  = require('bcryptjs')
const db      = require('../db/db')
const router  = express.Router()

// ── Admin login ────────────────────────────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  req.session.adminId = user.id
  req.session.isAdmin = true
  res.json({ ok: true })
})

router.post('/admin/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

// ── Participant (PIN) login ────────────────────────────────────────────────
router.post('/participant/login', (req, res) => {
  const { pin } = req.body
  if (!pin) return res.status(400).json({ error: 'PIN required' })

  const participant = db.prepare('SELECT * FROM participants WHERE pin = ?').get(pin)
  if (!participant) return res.status(401).json({ error: 'Invalid PIN' })

  const isFirstLogin = !participant.first_login_at

  if (isFirstLogin) {
    db.prepare('UPDATE participants SET first_login_at = datetime(\'now\') WHERE pin = ?').run(pin)
  }

  req.session.pin = pin
  req.session.isParticipant = true
  res.json({ ok: true, isFirstLogin, participant })
})

router.post('/participant/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

module.exports = router
