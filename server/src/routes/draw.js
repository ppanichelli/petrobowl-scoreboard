const express      = require('express')
const { v4: uuidv4 } = require('uuid')
const db           = require('../db/db')
const requireAdmin = require('../middleware/requireAdmin')

const GROUP_SEQUENCES = {
  4: [[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]],
  5: [[1,2],[3,4],[1,5],[2,3],[4,5],[1,3],[2,5],[1,4],[2,4],[3,5]],
}

function computeGroups(totalTeams) {
  const G = totalTeams < 20 ? 4 : 5
  const letters = ['A','B','C','D','E'].slice(0, G)
  const base = Math.floor(totalTeams / G)
  const extra = totalTeams % G
  return letters.map((letter, i) => ({ letter, size: i < extra ? base + 1 : base }))
}

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

adminRouter.post('/draw/generate', (req, res) => {
  const row = getState()
  const total_teams = row.total_teams
  const assignments = JSON.parse(row.assignments)
  const groups = computeGroups(total_teams)

  const missing = []
  for (const { letter, size } of groups) {
    for (let i = 1; i <= size; i++) {
      if (!assignments[`${letter}${i}`]) missing.push(`${letter}${i}`)
    }
  }
  if (missing.length > 0)
    return res.status(400).json({ error: `Missing assignments: ${missing.join(', ')}` })

  const existing = db.prepare("SELECT id, status FROM matches WHERE stage = 'group'").all()
  if (existing.length > 0 && !req.body.force)
    return res.status(409).json({ error: 'Group matches already exist', match_count: existing.length })

  if (existing.length > 0 && req.body.force) {
    const blocked = existing.filter(m => m.status !== 'setup')
    if (blocked.length > 0)
      return res.status(400).json({ error: 'Cannot regenerate: some group matches are live or finished' })
    db.transaction(() => {
      for (const { id } of existing) {
        db.prepare('DELETE FROM prospects WHERE match_id = ?').run(id)
        db.prepare('DELETE FROM matches WHERE id = ?').run(id)
      }
    })()
  }

  const unsupported = groups.find(g => !GROUP_SEQUENCES[g.size])
  if (unsupported)
    return res.status(400).json({ error: `Unsupported group size: ${unsupported.size}` })

  const groupSequences = groups.map(g => ({ letter: g.letter, rounds: GROUP_SEQUENCES[g.size] }))

  const maxRounds = Math.max(...groupSequences.map(g => g.rounds.length))
  const matchList = []
  for (let round = 0; round < maxRounds; round++) {
    for (const { letter, rounds } of groupSequences) {
      if (round >= rounds.length) continue
      const [s1, s2] = rounds[round]
      matchList.push({ group: letter, teamA: assignments[`${letter}${s1}`], teamB: assignments[`${letter}${s2}`] })
    }
  }

  db.transaction(() => {
    for (const { group, teamA, teamB } of matchList) {
      db.prepare(`
        INSERT INTO matches (id, team_a_id, team_b_id, stage, total_questions, group_name, prospecting_open)
        VALUES (?, ?, ?, 'group', 10, ?, 1)
      `).run(uuidv4(), teamA, teamB, group)
    }
  })()

  res.json({ ok: true, match_count: matchList.length })
})

module.exports = { publicRouter, adminRouter }
