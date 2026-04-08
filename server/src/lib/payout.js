const db = require('../db/db')

/**
 * After a match finishes, calculate and distribute prospect payouts.
 * - Draw → all prospects are void (payout = 0, no points added)
 * - Winner → correct prospectors earn frozen_odds points; wrong get 0
 */
function processPayout(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId)
  if (!match) throw new Error('Match not found: ' + matchId)

  const prospects = db.prepare(
    'SELECT * FROM prospects WHERE match_id = ? AND is_locked = 1'
  ).all(matchId)

  if (prospects.length === 0) return

  const update = db.prepare(
    'UPDATE prospects SET payout = ? WHERE id = ?'
  )
  const addPoints = db.prepare(
    'UPDATE participants SET total_points = total_points + ? WHERE pin = ?'
  )

  const distribute = db.transaction(() => {
    for (const p of prospects) {
      if (match.is_draw) {
        // Void — no points awarded or deducted
        update.run(0, p.id)
        continue
      }

      if (p.prospected_team_id === match.winner_id) {
        // Correct: earn frozen odds for the team they picked
        const payout = p.prospected_team_id === match.team_a_id
          ? match.frozen_odds_a
          : match.frozen_odds_b
        update.run(payout, p.id)
        addPoints.run(payout, p.pin)
      } else {
        // Wrong: 0 points, no deduction
        update.run(0, p.id)
      }
    }
  })

  distribute()
}

module.exports = { processPayout }
