const express         = require('express')
const db              = require('../db/db')
const { calcOdds }    = require('../lib/odds')
const router          = express.Router()

// Current live match
router.get('/matches/live', (req, res) => {
  const match = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.full_name AS team_a_full, ta.country_code AS team_a_cc, ta.logo_url AS team_a_logo,
           tb.short_name AS team_b_short, tb.full_name AS team_b_full, tb.country_code AS team_b_cc, tb.logo_url AS team_b_logo
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'live'
    ORDER BY m.created_at DESC LIMIT 1
  `).get()

  if (!match) return res.json(null)

  const actions = db.prepare(
    'SELECT * FROM actions WHERE match_id = ? AND is_undone = 0 ORDER BY sequence ASC'
  ).all(match.id)

  res.json({ match, actions })
})

// Next match (setup status) — includes live vote counts and odds for pre-match display
router.get('/matches/next', (req, res) => {
  const match = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.full_name AS team_a_full, ta.country_code AS team_a_cc, ta.logo_url AS team_a_logo,
           tb.short_name AS team_b_short, tb.full_name AS team_b_full, tb.country_code AS team_b_cc, tb.logo_url AS team_b_logo,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_a_id) AS votes_a,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_b_id) AS votes_b
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'setup'
    ORDER BY m.created_at ASC LIMIT 1
  `).get()

  if (!match) return res.json(null)

  const { oddsA, oddsB } = calcOdds(match.votes_a || 0, match.votes_b || 0)
  res.json({ ...match, odds_a: oddsA, odds_b: oddsB })
})

// Match history
router.get('/matches/history', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.country_code AS team_a_cc,
           ta.logo_url AS team_a_logo, ta.logo_small_url AS team_a_logo_small,
           tb.short_name AS team_b_short, tb.country_code AS team_b_cc,
           tb.logo_url AS team_b_logo, tb.logo_small_url AS team_b_logo_small
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'finished'
    ORDER BY m.finished_at DESC
  `).all()
  res.json(matches)
})

// Public leaderboard
router.get('/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT pin, display_name, country_code, total_points
    FROM participants
    WHERE display_name IS NOT NULL AND display_name != ''
    ORDER BY total_points DESC
    LIMIT 100
  `).all()

  const ranked = rows.map((r, i) => ({ rank: i + 1, ...r }))
  res.json(ranked)
})

// All setup + live matches (for the public schedule view)
router.get('/matches/upcoming', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.country_code AS team_a_cc,
           ta.logo_url AS team_a_logo, ta.logo_small_url AS team_a_logo_small,
           tb.short_name AS team_b_short, tb.country_code AS team_b_cc,
           tb.logo_url AS team_b_logo, tb.logo_small_url AS team_b_logo_small,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_a_id) AS votes_a,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_b_id) AS votes_b
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status IN ('setup', 'live')
    ORDER BY m.created_at ASC
  `).all()
  const withOdds = matches.map(m => {
    const { oddsA, oddsB } = calcOdds(m.votes_a || 0, m.votes_b || 0)
    return { ...m, odds_a: oddsA, odds_b: oddsB }
  })
  res.json(withOdds)
})

// Open matches with vote counts (for the public prospects display)
router.get('/matches/open', (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
           ta.short_name AS team_a_short, ta.full_name AS team_a_full, ta.country_code AS team_a_cc,
           tb.short_name AS team_b_short, tb.full_name AS team_b_full, tb.country_code AS team_b_cc,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_a_id) AS votes_a,
           (SELECT COUNT(*) FROM prospects WHERE match_id = m.id AND prospected_team_id = m.team_b_id) AS votes_b
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.status = 'setup' AND m.prospecting_open = 1
    ORDER BY m.created_at ASC
  `).all()
  const withOdds = matches.map(m => {
    const { oddsA, oddsB } = calcOdds(m.votes_a || 0, m.votes_b || 0)
    return { ...m, odds_a: oddsA, odds_b: oddsB }
  })
  res.json(withOdds)
})

module.exports = router
