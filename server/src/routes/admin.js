const express      = require('express')
const { v4: uuidv4 } = require('uuid')
const path         = require('path')
const fs           = require('fs')
const db           = require('../db/db')
const requireAdmin = require('../middleware/requireAdmin')
const { calcOdds } = require('../lib/odds')
const { processPayout } = require('../lib/payout')
const { saveSnapshot }  = require('../lib/snapshot')
const { tryCreateDownstreamMatches } = require('../lib/bracket')

const router = express.Router()
router.use(requireAdmin)

// Helper: fetch a match row with full team info (names, logos, flags)
function getMatchFull(id) {
  return db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.full_name AS team_a_full,
           ta.country_code AS team_a_cc, ta.logo_url AS team_a_logo,
           tb.short_name AS team_b_short, tb.full_name AS team_b_full,
           tb.country_code AS team_b_cc, tb.logo_url AS team_b_logo
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.id = ?
  `).get(id)
}

// ── Session check ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => res.json({ ok: true }))

// ── List teams ─────────────────────────────────────────────────────────────
router.get('/teams', (req, res) => {
  res.json(db.prepare('SELECT * FROM teams ORDER BY short_name ASC').all())
})

// ── List all matches (with live vote counts + odds) ───────────────────────
router.get('/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.country_code AS team_a_cc,
           tb.short_name AS team_b_short, tb.country_code AS team_b_cc,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_a_id) AS votes_a,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_b_id) AS votes_b
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    ORDER BY m.created_at ASC
  `).all()

  const withOdds = matches.map(m => {
    const { oddsA, oddsB } = calcOdds(m.votes_a || 0, m.votes_b || 0)
    return { ...m, odds_a: oddsA, odds_b: oddsB }
  })
  res.json(withOdds)
})

// ── Load a batch of upcoming matches ──────────────────────────────────────
router.post('/matches/batch', (req, res) => {
  const { matches } = req.body
  if (!Array.isArray(matches) || matches.length === 0) {
    return res.status(400).json({ error: 'matches array required' })
  }

  const batchId = uuidv4()
  const insert = db.prepare(`
    INSERT INTO matches (id, team_a_id, team_b_id, stage, total_questions, batch_id, group_name)
    VALUES (@id, @team_a_id, @team_b_id, @stage, @total_questions, @batch_id, @group_name)
  `)

  const run = db.transaction(() => {
    for (const m of matches) {
      insert.run({
        id: uuidv4(),
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
        stage: m.stage,
        total_questions: m.total_questions,
        batch_id: batchId,
        group_name: m.stage === 'group' ? (m.group_name || null) : null,
      })
    }
  })
  run()

  // Emit socket notification (attached to req by index.js)
  req.io.emit('notifications', { type: 'new_batch', batchId })

  res.json({ ok: true, batchId })
})

// ── Delete a match (only if status = setup) ────────────────────────────────
router.delete('/matches/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'setup') return res.status(400).json({ error: 'Cannot delete a started or finished match' })

  db.transaction(() => {
    db.prepare('DELETE FROM prospects WHERE match_id = ?').run(req.params.id)
    db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id)
  })()

  res.json({ ok: true })
})

// ── Start match (lock prospects, freeze odds) ──────────────────────────────
router.post('/matches/:id/start', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'setup') return res.status(400).json({ error: 'Match already started' })

  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_a,
      SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_b
    FROM prospects WHERE match_id = ?
  `).get(match.team_a_id, match.team_b_id, match.id)

  const prospectsA = counts.cnt_a || 0
  const prospectsB = counts.cnt_b || 0
  const { oddsA, oddsB } = calcOdds(prospectsA, prospectsB)

  db.transaction(() => {
    db.prepare(`
      UPDATE matches SET
        status = 'live',
        prospecting_open = 0,
        frozen_odds_a = ?,
        frozen_odds_b = ?,
        frozen_prospects_a = ?,
        frozen_prospects_b = ?
      WHERE id = ?
    `).run(oddsA, oddsB, prospectsA, prospectsB, match.id)

    db.prepare('UPDATE prospects SET is_locked = 1 WHERE match_id = ?').run(match.id)
  })()

  const updated = getMatchFull(match.id)
  req.io.to(`match:${match.id}`).emit('match_started', updated)

  res.json(updated)
})

// ── Log a scoring action ───────────────────────────────────────────────────
router.post('/matches/:id/action', (req, res) => {
  const { action_type } = req.body
  const validTypes = ['correct_a', 'correct_b', 'incorrect_a', 'incorrect_b', 'skip']
  if (!validTypes.includes(action_type)) return res.status(400).json({ error: 'Invalid action_type' })

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'live') return res.status(400).json({ error: 'Match not live' })

  // Determine current question number from non-undone actions
  const actions = db.prepare(
    'SELECT * FROM actions WHERE match_id = ? AND is_undone = 0 ORDER BY sequence ASC'
  ).all(match.id)

  // Question advances on: correct_a, correct_b, skip, and when BOTH teams have answered the same question
  const currentQuestion = computeCurrentQuestion(actions) + 1
  const seq = (db.prepare('SELECT MAX(sequence) AS s FROM actions WHERE match_id = ?').get(match.id).s || 0) + 1

  let scoreADelta = 0
  let scoreBDelta = 0
  if (action_type === 'correct_a') scoreADelta = 10
  if (action_type === 'correct_b') scoreBDelta = 10
  if (action_type === 'incorrect_a') scoreADelta = -5
  if (action_type === 'incorrect_b') scoreBDelta = -5

  db.transaction(() => {
    db.prepare(`
      INSERT INTO actions (id, match_id, sequence, question_number, action_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), match.id, seq, currentQuestion, action_type)

    if (scoreADelta || scoreBDelta) {
      db.prepare(`
        UPDATE matches SET score_a = score_a + ?, score_b = score_b + ? WHERE id = ?
      `).run(scoreADelta, scoreBDelta, match.id)
    }
  })()

  const updated = getMatchFull(match.id)
  const allActions = db.prepare(
    'SELECT * FROM actions WHERE match_id = ? AND is_undone = 0 ORDER BY sequence ASC'
  ).all(match.id)

  req.io.to(`match:${match.id}`).emit('score_update', { match: updated, actions: allActions })

  // Auto-finish when all questions are resolved
  if (computeCurrentQuestion(allActions) >= match.total_questions) {
    const isDraw   = updated.score_a === updated.score_b
    const winnerId = isDraw ? null : (updated.score_a > updated.score_b ? updated.team_a_id : updated.team_b_id)
    db.prepare(`UPDATE matches SET status='finished', is_draw=?, winner_id=?, finished_at=datetime('now') WHERE id=?`)
      .run(isDraw ? 1 : 0, winnerId, match.id)
    processPayout(match.id)
    if (match.parent_match_id && !isDraw) {
      db.prepare('UPDATE matches SET is_draw = 0, winner_id = ? WHERE id = ?')
        .run(winnerId, match.parent_match_id)
      processPayout(match.parent_match_id)
      const parent = db.prepare('SELECT bracket_slot FROM matches WHERE id = ?').get(match.parent_match_id)
      if (parent && parent.bracket_slot) tryCreateDownstreamMatches(parent.bracket_slot, req.io)
    }
    saveSnapshot(match.id)
    const finished = getMatchFull(match.id)
    req.io.to(`match:${match.id}`).emit('match_finished', finished)
    req.io.emit('leaderboard', { type: 'leaderboard_update' })
    if (match.bracket_slot && winnerId) tryCreateDownstreamMatches(match.bracket_slot, req.io)
    return res.json({ match: finished, actions: allActions, autoFinished: true })
  }

  res.json({ match: updated, actions: allActions })
})

// ── Undo last action ───────────────────────────────────────────────────────
router.post('/matches/:id/undo', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'live') return res.status(400).json({ error: 'Match not live' })

  const last = db.prepare(`
    SELECT * FROM actions WHERE match_id = ? AND is_undone = 0
    ORDER BY sequence DESC LIMIT 1
  `).get(match.id)

  if (!last) return res.status(400).json({ error: 'Nothing to undo' })

  let scoreADelta = 0
  let scoreBDelta = 0
  if (last.action_type === 'correct_a')   scoreADelta = -10
  if (last.action_type === 'correct_b')   scoreBDelta = -10
  if (last.action_type === 'incorrect_a') scoreADelta = 5
  if (last.action_type === 'incorrect_b') scoreBDelta = 5

  db.transaction(() => {
    db.prepare('UPDATE actions SET is_undone = 1 WHERE id = ?').run(last.id)
    if (scoreADelta || scoreBDelta) {
      db.prepare('UPDATE matches SET score_a = score_a + ?, score_b = score_b + ? WHERE id = ?')
        .run(scoreADelta, scoreBDelta, match.id)
    }
  })()

  const updated  = getMatchFull(match.id)
  const allActions = db.prepare(
    'SELECT * FROM actions WHERE match_id = ? AND is_undone = 0 ORDER BY sequence ASC'
  ).all(match.id)

  req.io.to(`match:${match.id}`).emit('score_update', { match: updated, actions: allActions })
  res.json({ match: updated, actions: allActions })
})

// ── Full match reset ───────────────────────────────────────────────────────
router.post('/matches/:id/reset', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'live') return res.status(400).json({ error: 'Match not live' })

  db.transaction(() => {
    db.prepare('UPDATE actions SET is_undone = 1 WHERE match_id = ?').run(match.id)
    db.prepare('UPDATE matches SET score_a = 0, score_b = 0 WHERE id = ?').run(match.id)
  })()

  const updated = getMatchFull(match.id)
  req.io.to(`match:${match.id}`).emit('score_update', { match: updated, actions: [] })
  res.json({ match: updated, actions: [] })
})

// ── Finish match ───────────────────────────────────────────────────────────
router.post('/matches/:id/finish', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!match) return res.status(404).json({ error: 'Not found' })
  if (match.status !== 'live') return res.status(400).json({ error: 'Match not live' })

  const isDraw   = match.score_a === match.score_b
  const winnerId = isDraw ? null : (match.score_a > match.score_b ? match.team_a_id : match.team_b_id)

  db.prepare(`
    UPDATE matches SET status = 'finished', is_draw = ?, winner_id = ?, finished_at = datetime('now')
    WHERE id = ?
  `).run(isDraw ? 1 : 0, winnerId, match.id)

  processPayout(match.id)
  if (match.parent_match_id && !isDraw) {
    db.prepare('UPDATE matches SET is_draw = 0, winner_id = ? WHERE id = ?')
      .run(winnerId, match.parent_match_id)
    processPayout(match.parent_match_id)
    const parent = db.prepare('SELECT bracket_slot FROM matches WHERE id = ?').get(match.parent_match_id)
    if (parent && parent.bracket_slot) tryCreateDownstreamMatches(parent.bracket_slot, req.io)
  }
  saveSnapshot(match.id)

  const updated = getMatchFull(match.id)
  req.io.to(`match:${match.id}`).emit('match_finished', updated)
  req.io.emit('leaderboard', { type: 'leaderboard_update' })
  if (match.bracket_slot && winnerId) tryCreateDownstreamMatches(match.bracket_slot, req.io)

  res.json(updated)
})

// ── Create tiebreaker ──────────────────────────────────────────────────────
router.post('/matches/:id/tiebreaker', (req, res) => {
  const parent = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!parent) return res.status(404).json({ error: 'Not found' })
  if (!parent.is_draw) return res.status(400).json({ error: 'Match is not a draw' })

  const tbId = uuidv4()
  db.prepare(`
    INSERT INTO matches (id, team_a_id, team_b_id, stage, total_questions, parent_match_id, batch_id)
    VALUES (?, ?, ?, 'tiebreaker', 5, ?, ?)
  `).run(tbId, parent.team_a_id, parent.team_b_id, parent.id, parent.batch_id)

  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(tbId))
})

// ── Generate PINs ──────────────────────────────────────────────────────────
router.post('/pins/generate', (req, res) => {
  const { count = 50 } = req.body
  const insert = db.prepare('INSERT OR IGNORE INTO participants (pin) VALUES (?)')
  const existing = new Set(
    db.prepare('SELECT pin FROM participants').all().map(r => r.pin)
  )
  const generated = []
  const run = db.transaction(() => {
    while (generated.length < count) {
      const pin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
      if (!existing.has(pin)) {
        existing.add(pin)
        insert.run(pin)
        generated.push(pin)
      }
    }
  })
  run()
  res.json({ ok: true, pins: generated })
})

// ── Database reset ─────────────────────────────────────────────────────────
router.post('/database/reset', (req, res) => {
  if (req.body.confirm !== 'RESET') {
    return res.status(400).json({ error: 'Send { confirm: "RESET" } to confirm' })
  }

  const PIN_COUNT = 500

  db.transaction(() => {
    db.prepare('DELETE FROM leaderboard_snapshots').run()
    db.prepare('DELETE FROM prospects').run()
    db.prepare('DELETE FROM actions').run()
    db.prepare('DELETE FROM matches').run()
    db.prepare('DELETE FROM participants').run()
  })()

  // Generate fresh PINs
  const insert = db.prepare('INSERT OR IGNORE INTO participants (pin) VALUES (?)')
  const generated = []
  const seen = new Set()
  db.transaction(() => {
    while (generated.length < PIN_COUNT) {
      const pin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
      if (!seen.has(pin)) {
        seen.add(pin)
        insert.run(pin)
        generated.push(pin)
      }
    }
  })()

  // Save PINs to file
  const dataDir = path.join(__dirname, '../../data')
  fs.mkdirSync(dataDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = path.join(dataDir, `pins_${timestamp}.txt`)
  fs.writeFileSync(filePath, generated.join('\n'), 'utf8')

  res.json({ ok: true, message: `Database reset complete. ${PIN_COUNT} new PINs generated.`, pins_file: filePath })
})

// ── Helpers ────────────────────────────────────────────────────────────────

// Returns how many questions have been fully resolved (i.e., how many are done).
// pendingRebuttal tracks WHICH team already answered incorrectly ('a' | 'b' | null)
// so that pressing incorrect_a twice never falsely advances the counter.
function computeCurrentQuestion(actions) {
  let question = 0
  let pendingRebuttal = null // 'a' | 'b' | null

  for (const a of actions) {
    if (a.action_type === 'correct_a' || a.action_type === 'correct_b' || a.action_type === 'skip') {
      question++
      pendingRebuttal = null
    } else if (a.action_type === 'incorrect_a') {
      if (pendingRebuttal === 'b') { question++; pendingRebuttal = null }  // both missed → advance
      else if (!pendingRebuttal)   { pendingRebuttal = 'a' }               // A missed first → B gets rebuttal
      // if pendingRebuttal === 'a': ignore duplicate (same team can't answer twice)
    } else if (a.action_type === 'incorrect_b') {
      if (pendingRebuttal === 'a') { question++; pendingRebuttal = null }  // both missed → advance
      else if (!pendingRebuttal)   { pendingRebuttal = 'b' }               // B missed first → A gets rebuttal
      // if pendingRebuttal === 'b': ignore duplicate
    }
  }

  return question
}

module.exports = router
