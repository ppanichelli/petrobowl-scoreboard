const express      = require('express')
const db           = require('../db/db')
const requireAdmin = require('../middleware/requireAdmin')

const publicRouter = express.Router()
const adminRouter  = express.Router()
adminRouter.use(requireAdmin)

function getState() {
  return db.prepare('SELECT total_teams, assignments FROM draw_state WHERE id = 1').get()
}

function broadcastDraw(io) {
  const row = getState()
  const state = { total_teams: row.total_teams, assignments: JSON.parse(row.assignments) }
  io.emit('draw:updated', state)
}

// ── Public ─────────────────────────────────────────────────────────────────

publicRouter.get('/draw', (req, res) => {
  const row = getState()
  res.json({ total_teams: row.total_teams, assignments: JSON.parse(row.assignments) })
})

publicRouter.get('/teams', (req, res) => {
  res.json(db.prepare('SELECT id, short_name, logo_small_url, country_code FROM teams ORDER BY short_name ASC').all())
})

// ── Admin ──────────────────────────────────────────────────────────────────

adminRouter.post('/draw/config', (req, res) => {
  const total = parseInt(req.body.total_teams, 10)
  if (!total || total < 4 || total > 40) return res.status(400).json({ error: 'Invalid total_teams' })
  db.prepare(`UPDATE draw_state SET total_teams = ?, assignments = '{}', updated_at = datetime('now') WHERE id = 1`).run(total)
  broadcastDraw(req.io)
  res.json({ ok: true })
})

adminRouter.put('/draw/assign', (req, res) => {
  const { slot, team_id } = req.body
  if (!slot || !team_id) return res.status(400).json({ error: 'slot and team_id required' })
  const row = getState()
  const assignments = JSON.parse(row.assignments)
  assignments[slot] = team_id
  db.prepare(`UPDATE draw_state SET assignments = ?, updated_at = datetime('now') WHERE id = 1`).run(JSON.stringify(assignments))
  broadcastDraw(req.io)
  res.json({ ok: true })
})

adminRouter.delete('/draw/assign/:slot', (req, res) => {
  const row = getState()
  const assignments = JSON.parse(row.assignments)
  delete assignments[req.params.slot]
  db.prepare(`UPDATE draw_state SET assignments = ?, updated_at = datetime('now') WHERE id = 1`).run(JSON.stringify(assignments))
  broadcastDraw(req.io)
  res.json({ ok: true })
})

adminRouter.post('/draw/reset', (req, res) => {
  db.prepare(`UPDATE draw_state SET assignments = '{}', updated_at = datetime('now') WHERE id = 1`).run()
  broadcastDraw(req.io)
  res.json({ ok: true })
})

module.exports = { publicRouter, adminRouter }
