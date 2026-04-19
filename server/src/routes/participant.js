const express             = require('express')
const { v4: uuidv4 }      = require('uuid')
const db                  = require('../db/db')
const requireParticipant  = require('../middleware/requireParticipant')
const { calcOdds }        = require('../lib/odds')

const router = express.Router()
router.use(requireParticipant)

// ── Profile update (name + country) ───────────────────────────────────────
router.put('/profile', (req, res) => {
  const { display_name, country_code } = req.body
  const name = display_name ? String(display_name).trim().slice(0, 50) : null
  db.prepare(
    'UPDATE participants SET display_name = ?, country_code = ? WHERE pin = ?'
  ).run(name || null, country_code || null, req.session.pin)
  res.json({ ok: true })
})

// ── Upcoming matches with live odds ───────────────────────────────────────
router.get('/matches', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.full_name AS team_a_full, ta.country_code AS team_a_cc, ta.logo_url AS team_a_logo,
           tb.short_name AS team_b_short, tb.full_name AS team_b_full, tb.country_code AS team_b_cc, tb.logo_url AS team_b_logo
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status IN ('setup', 'live')
    ORDER BY m.created_at ASC
  `).all()

  // Attach live odds to each setup match
  const withOdds = matches.map(m => {
    if (m.status === 'live') {
      return { ...m, odds_a: m.frozen_odds_a, odds_b: m.frozen_odds_b }
    }

    const counts = db.prepare(`
      SELECT
        SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_a,
        SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_b
      FROM prospects WHERE match_id = ?
    `).get(m.team_a_id, m.team_b_id, m.id)

    const { oddsA, oddsB } = calcOdds(counts.cnt_a || 0, counts.cnt_b || 0)
    return { ...m, odds_a: oddsA, odds_b: oddsB }
  })

  // Attach participant's own prospect for each match
  const myProspects = db.prepare(
    'SELECT match_id, prospected_team_id FROM prospects WHERE pin = ?'
  ).all(req.session.pin)
  const prospectMap = Object.fromEntries(myProspects.map(p => [p.match_id, p.prospected_team_id]))

  const result = withOdds.map(m => ({
    ...m,
    my_prospect: prospectMap[m.id] || null,
  }))

  res.json(result)
})

// ── Place or update a prospect ─────────────────────────────────────────────
router.post('/prospect', (req, res) => {
  const { match_id, team_id } = req.body
  if (!match_id || !team_id) return res.status(400).json({ error: 'match_id and team_id required' })

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id)
  if (!match) return res.status(404).json({ error: 'Match not found' })
  if (!match.prospecting_open) return res.status(400).json({ error: 'Prospects are locked for this match' })
  if (team_id !== match.team_a_id && team_id !== match.team_b_id) {
    return res.status(400).json({ error: 'Invalid team for this match' })
  }

  const existing = db.prepare(
    'SELECT * FROM prospects WHERE pin = ? AND match_id = ?'
  ).get(req.session.pin, match_id)

  if (existing) {
    db.prepare(
      'UPDATE prospects SET prospected_team_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(team_id, existing.id)
  } else {
    db.prepare(`
      INSERT INTO prospects (id, pin, match_id, prospected_team_id)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.session.pin, match_id, team_id)
  }

  // Broadcast updated odds to all participants watching this match
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_a,
      SUM(CASE WHEN prospected_team_id = ? THEN 1 ELSE 0 END) AS cnt_b
    FROM prospects WHERE match_id = ?
  `).get(match.team_a_id, match.team_b_id, match_id)

  const { oddsA, oddsB } = calcOdds(counts.cnt_a || 0, counts.cnt_b || 0)
  req.io.to(`odds:${match_id}`).emit('odds_update', {
    match_id,
    oddsA, oddsB,
    votes_a: counts.cnt_a || 0,
    votes_b: counts.cnt_b || 0,
  })

  res.json({ ok: true, oddsA, oddsB })
})

// ── My prospect history ────────────────────────────────────────────────────
router.get('/prospects', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
           m.stage, m.status AS match_status, m.is_draw,
           ta.short_name AS team_a_short, tb.short_name AS team_b_short,
           w.short_name AS winner_short
    FROM prospects p
    JOIN matches m ON m.id = p.match_id
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN teams w ON w.id = m.winner_id
    WHERE p.pin = ?
    ORDER BY p.created_at DESC
  `).all(req.session.pin)
  res.json(rows)
})

// ── Leaderboard ───────────────────────────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT pin, display_name, country_code, total_points
    FROM participants
    WHERE display_name IS NOT NULL AND display_name != ''
    ORDER BY total_points DESC
    LIMIT 100
  `).all()

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    display_name: r.display_name,
    country_code: r.country_code,
    total_points: r.total_points,
    isMe: r.pin === req.session.pin,  // computed server-side; PIN never sent to client
  }))
  res.json(ranked)
})

// ── Point progression ──────────────────────────────────────────────────────
router.get('/progression', (req, res) => {
  const rows = db.prepare(`
    SELECT ls.match_id, ls.cumulative_points, ls.rank, ls.created_at,
           m.stage, ta.short_name AS team_a, tb.short_name AS team_b
    FROM leaderboard_snapshots ls
    JOIN matches m ON m.id = ls.match_id
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE ls.pin = ?
    ORDER BY ls.created_at ASC
  `).all(req.session.pin)
  res.json(rows)
})

// ── My profile ─────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const p = db.prepare('SELECT * FROM participants WHERE pin = ?').get(req.session.pin)
  if (!p) return res.status(404).json({ error: 'Not found' })
  // Compute rank
  const rank = db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM participants WHERE total_points > ?
  `).get(p.total_points).rank
  res.json({ ...p, rank })
})

module.exports = router
