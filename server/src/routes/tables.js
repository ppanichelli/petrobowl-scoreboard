const express = require('express')
const db      = require('../db/db')
const router  = express.Router()

router.get('/tables', (req, res) => {
  const rows = db.prepare(`
    SELECT m.id, m.team_a_id, m.team_b_id, m.group_name, m.status,
           m.score_a, m.score_b, m.winner_id, m.is_draw,
           ta.short_name AS team_a_short, ta.country_code AS team_a_cc,
           ta.logo_small_url AS team_a_logo_small,
           tb.short_name AS team_b_short, tb.country_code AS team_b_cc,
           tb.logo_small_url AS team_b_logo_small
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.group_name IS NOT NULL AND m.group_name != ''
    ORDER BY m.group_name ASC, m.created_at ASC
  `).all()

  if (rows.length === 0) return res.json([])

  // Build per-group team standings and match list
  const groups = {}
  for (const m of rows) {
    if (!groups[m.group_name]) groups[m.group_name] = { teams: new Map(), matches: [] }
    const g = groups[m.group_name]
    g.matches.push(m)

    if (!g.teams.has(m.team_a_id)) {
      g.teams.set(m.team_a_id, {
        team_id: m.team_a_id, short_name: m.team_a_short,
        country_code: m.team_a_cc, logo_small_url: m.team_a_logo_small,
        mp: 0, pts: 0, plus: 0, minus: 0,
      })
    }
    if (!g.teams.has(m.team_b_id)) {
      g.teams.set(m.team_b_id, {
        team_id: m.team_b_id, short_name: m.team_b_short,
        country_code: m.team_b_cc, logo_small_url: m.team_b_logo_small,
        mp: 0, pts: 0, plus: 0, minus: 0,
      })
    }

    if (m.status !== 'finished') continue

    const a = g.teams.get(m.team_a_id)
    const b = g.teams.get(m.team_b_id)
    a.mp++; a.plus += m.score_a; a.minus += m.score_b
    b.mp++; b.plus += m.score_b; b.minus += m.score_a

    if (m.is_draw) {
      a.pts += 1; b.pts += 1
    } else if (m.winner_id === m.team_a_id) {
      a.pts += 3
    } else {
      b.pts += 3
    }
  }

  const result = Object.keys(groups).sort().map(group_name => {
    const g = groups[group_name]
    const standings = Array.from(g.teams.values()).map(t => ({ ...t, net: t.plus - t.minus }))

    standings.sort((a, b) => {
      if (b.pts  !== a.pts)  return b.pts  - a.pts
      if (b.plus !== a.plus) return b.plus - a.plus
      if (b.net  !== a.net)  return b.net  - a.net
      return a.short_name.localeCompare(b.short_name)
    })

    // Head-to-head only for exactly 2-team ties
    for (let i = 0; i < standings.length - 1; i++) {
      const a = standings[i], b = standings[i + 1]
      const tied = a.pts === b.pts && a.plus === b.plus && a.net === b.net
      if (!tied) continue
      const prevTied = i > 0 && standings[i - 1].pts === a.pts && standings[i - 1].plus === a.plus && standings[i - 1].net === a.net
      const nextTied = i + 2 < standings.length && standings[i + 2].pts === a.pts && standings[i + 2].plus === a.plus && standings[i + 2].net === a.net
      if (prevTied || nextTied) continue

      const h2h = g.matches.find(m =>
        m.status === 'finished' && !m.is_draw &&
        ((m.team_a_id === a.team_id && m.team_b_id === b.team_id) ||
         (m.team_a_id === b.team_id && m.team_b_id === a.team_id))
      )
      if (h2h && h2h.winner_id === b.team_id) {
        standings[i] = b; standings[i + 1] = a
      }
    }

    return { group: group_name, standings, matches: g.matches }
  })

  res.json(result)
})

module.exports = router
