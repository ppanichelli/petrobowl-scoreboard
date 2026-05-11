const express      = require('express')
const { v4: uuidv4 } = require('uuid')
const db           = require('../db/db')
const requireAdmin = require('../middleware/requireAdmin')
const { BRACKET_CONFIG, SEED_SLOTS, getBracketState } = require('../lib/bracket')

const publicRouter = express.Router()
const adminRouter  = express.Router()
adminRouter.use(requireAdmin)

function broadcastBracket(io) {
  io.to('bracket').emit('bracket:updated', getBracketState())
}

// ── Public ─────────────────────────────────────────────────────────────────

publicRouter.get('/bracket', (_req, res) => {
  res.json(getBracketState())
})

// ── Admin ──────────────────────────────────────────────────────────────────

// Assign a team to a seed slot
adminRouter.put('/bracket/assign', (req, res) => {
  const { slot, team_id } = req.body
  if (!slot || !team_id) return res.status(400).json({ error: 'slot and team_id required' })
  if (!SEED_SLOTS.includes(slot)) return res.status(400).json({ error: 'Invalid slot' })

  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(team_id)
  if (!team) return res.status(400).json({ error: 'Team not found' })

  db.prepare('INSERT OR REPLACE INTO bracket_slots (slot, team_id) VALUES (?, ?)').run(slot, team_id)
  broadcastBracket(req.io)
  res.json({ ok: true })
})

// Unassign a seed slot
adminRouter.delete('/bracket/assign/:slot', (req, res) => {
  if (!SEED_SLOTS.includes(req.params.slot)) return res.status(400).json({ error: 'Invalid slot' })
  db.prepare('DELETE FROM bracket_slots WHERE slot = ?').run(req.params.slot)
  broadcastBracket(req.io)
  res.json({ ok: true })
})

// Generate the 4 quarterfinal matches
adminRouter.post('/bracket/generate', (req, res) => {
  // All 8 seeds must be assigned
  const assigned = db.prepare('SELECT slot, team_id FROM bracket_slots').all()
  const assignedMap = Object.fromEntries(assigned.map(r => [r.slot, r.team_id]))
  const missing = SEED_SLOTS.filter(s => !assignedMap[s])
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing seed assignments: ${missing.join(', ')}` })
  }

  // No duplicate teams
  const teamIds = SEED_SLOTS.map(s => assignedMap[s])
  const unique = new Set(teamIds)
  if (unique.size !== teamIds.length) {
    return res.status(400).json({ error: 'Duplicate teams in bracket draw' })
  }

  // QF matches must not already exist
  const existingQF = db.prepare("SELECT id FROM matches WHERE bracket_slot IN ('QF1','QF2','QF3','QF4')").all()
  if (existingQF.length > 0) {
    return res.status(400).json({ error: 'Quarter-final matches already generated' })
  }

  const qfSlots = ['QF1', 'QF2', 'QF3', 'QF4']
  db.transaction(() => {
    for (const slot of qfSlots) {
      const cfg = BRACKET_CONFIG[slot]
      const teamA = assignedMap[cfg.a]
      const teamB = assignedMap[cfg.b]
      db.prepare(`
        INSERT INTO matches (id, team_a_id, team_b_id, stage, total_questions, bracket_slot, prospecting_open)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(uuidv4(), teamA, teamB, cfg.stage, cfg.questions, slot)
    }
  })()

  broadcastBracket(req.io)
  res.json({ ok: true })
})

// Reset bracket: clear slots and delete setup-only bracket matches
adminRouter.delete('/bracket/reset', (req, res) => {
  const blocked = db.prepare(`
    SELECT id FROM matches WHERE bracket_slot IS NOT NULL AND status != 'setup'
  `).all()
  if (blocked.length > 0) {
    return res.status(400).json({ error: 'Cannot reset: bracket has live or finished matches' })
  }

  db.transaction(() => {
    const setupIds = db.prepare("SELECT id FROM matches WHERE bracket_slot IS NOT NULL AND status = 'setup'").all()
    for (const { id } of setupIds) {
      db.prepare('DELETE FROM prospects WHERE match_id = ?').run(id)
      db.prepare('DELETE FROM matches WHERE id = ?').run(id)
    }
    db.prepare('DELETE FROM bracket_slots').run()
  })()

  broadcastBracket(req.io)
  res.json({ ok: true })
})

module.exports = { publicRouter, adminRouter }
