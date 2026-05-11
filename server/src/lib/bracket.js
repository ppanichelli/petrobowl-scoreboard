const { v4: uuidv4 } = require('uuid')
const db = require('../db/db')

// Ordered slot keys for the 8 seeded positions
const SEED_SLOTS = ['seed_1a', 'seed_2c', 'seed_1b', 'seed_2d', 'seed_1c', 'seed_2a', 'seed_1d', 'seed_2b']

const BRACKET_CONFIG = {
  QF1:  { stage: 'quarterfinal',  questions: 20, a: 'seed_1a',     b: 'seed_2c'     },
  QF2:  { stage: 'quarterfinal',  questions: 20, a: 'seed_1b',     b: 'seed_2d'     },
  QF3:  { stage: 'quarterfinal',  questions: 20, a: 'seed_1c',     b: 'seed_2a'     },
  QF4:  { stage: 'quarterfinal',  questions: 20, a: 'seed_1d',     b: 'seed_2b'     },
  WBS1: { stage: 'semifinal',     questions: 30, a: 'winner:QF1',  b: 'winner:QF2',  needs: ['QF1', 'QF2']  },
  WBS2: { stage: 'semifinal',     questions: 30, a: 'winner:QF3',  b: 'winner:QF4',  needs: ['QF3', 'QF4']  },
  LBS1: { stage: 'loser_bracket', questions: 20, a: 'loser:QF1',   b: 'loser:QF2',   needs: ['QF1', 'QF2']  },
  LBS2: { stage: 'loser_bracket', questions: 20, a: 'loser:QF3',   b: 'loser:QF4',   needs: ['QF3', 'QF4']  },
  LBF:  { stage: 'loser_bracket', questions: 20, a: 'winner:LBS1', b: 'winner:LBS2', needs: ['LBS1', 'LBS2'] },
  '3P': { stage: 'third_place',   questions: 40, a: 'loser:WBS1',  b: 'loser:WBS2',  needs: ['WBS1', 'WBS2'] },
  GF:   { stage: 'final',         questions: 40, a: 'winner:WBS1', b: 'winner:WBS2', needs: ['WBS1', 'WBS2'] },
}

// All downstream slots that may be unlocked when a given slot finishes
const DOWNSTREAM = {
  QF1:  ['WBS1', 'LBS1'],
  QF2:  ['WBS1', 'LBS1'],
  QF3:  ['WBS2', 'LBS2'],
  QF4:  ['WBS2', 'LBS2'],
  WBS1: ['GF', '3P'],
  WBS2: ['GF', '3P'],
  LBS1: ['LBF'],
  LBS2: ['LBF'],
}

// Resolve a team source string to a team_id using the DB.
// Sources are either a seed key ('seed_1a') or 'winner:SLOT' / 'loser:SLOT'.
function resolveTeam(source) {
  if (source.startsWith('seed_')) {
    const row = db.prepare('SELECT team_id FROM bracket_slots WHERE slot = ?').get(source)
    return row ? row.team_id : null
  }
  const [role, slot] = source.split(':')
  const match = db.prepare('SELECT winner_id, team_a_id, team_b_id FROM matches WHERE bracket_slot = ? AND status = ?').get(slot, 'finished')
  if (!match || !match.winner_id) return null
  if (role === 'winner') return match.winner_id
  // loser = the team that is NOT the winner
  return match.team_a_id === match.winner_id ? match.team_b_id : match.team_a_id
}

function getBracketState() {
  const slotRows = db.prepare('SELECT slot, team_id FROM bracket_slots').all()
  const slots = {}
  for (const r of slotRows) {
    const team = r.team_id
      ? db.prepare('SELECT id, short_name, logo_small_url, country_code FROM teams WHERE id = ?').get(r.team_id)
      : null
    slots[r.slot] = team ? { team_id: team.id, short_name: team.short_name, logo_small_url: team.logo_small_url, country_code: team.country_code } : null
  }

  const matchRows = db.prepare(`
    SELECT m.id, m.bracket_slot, m.status, m.stage, m.score_a, m.score_b, m.winner_id, m.is_draw,
           ta.short_name AS team_a_short, ta.logo_small_url AS team_a_logo, ta.country_code AS team_a_cc,
           tb.short_name AS team_b_short, tb.logo_small_url AS team_b_logo, tb.country_code AS team_b_cc,
           m.team_a_id, m.team_b_id
    FROM matches m
    JOIN teams ta ON ta.id = m.team_a_id
    JOIN teams tb ON tb.id = m.team_b_id
    WHERE m.bracket_slot IS NOT NULL
    ORDER BY m.created_at ASC
  `).all()

  // Attach tiebreaker scores if applicable
  const matches = matchRows.map(m => {
    const tb = db.prepare(`
      SELECT score_a AS tb_score_a, score_b AS tb_score_b
      FROM matches WHERE parent_match_id = ? AND stage = 'tiebreaker' AND status = 'finished'
      ORDER BY created_at DESC LIMIT 1
    `).get(m.id)
    return {
      ...m,
      tiebreaker_score_a: tb ? tb.tb_score_a : null,
      tiebreaker_score_b: tb ? tb.tb_score_b : null,
    }
  })

  return { slots, matches }
}

function tryCreateDownstreamMatches(finishedSlot, io) {
  const candidates = DOWNSTREAM[finishedSlot] || []
  for (const candidateSlot of candidates) {
    // Skip if already exists
    const existing = db.prepare('SELECT id FROM matches WHERE bracket_slot = ?').get(candidateSlot)
    if (existing) continue

    const cfg = BRACKET_CONFIG[candidateSlot]
    if (!cfg) continue

    // Check all prerequisites are finished with a resolved winner
    const allReady = cfg.needs.every(needSlot => {
      const m = db.prepare('SELECT winner_id FROM matches WHERE bracket_slot = ? AND status = ?').get(needSlot, 'finished')
      return m && m.winner_id
    })
    if (!allReady) continue

    const teamA = resolveTeam(cfg.a)
    const teamB = resolveTeam(cfg.b)
    if (!teamA || !teamB) continue

    const newId = uuidv4()
    db.prepare(`
      INSERT INTO matches (id, team_a_id, team_b_id, stage, total_questions, bracket_slot, prospecting_open)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(newId, teamA, teamB, cfg.stage, cfg.questions, candidateSlot)

    if (io) {
      const state = getBracketState()
      io.to('bracket').emit('bracket:updated', state)
    }
  }
}

module.exports = { BRACKET_CONFIG, SEED_SLOTS, getBracketState, tryCreateDownstreamMatches }
