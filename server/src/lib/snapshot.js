const db = require('../db/db')
const { v4: uuidv4 } = require('uuid')

/**
 * Save a leaderboard snapshot after a match finishes.
 * Stores every participant's cumulative_points and rank at this moment.
 */
function saveSnapshot(matchId) {
  const participants = db.prepare(
    'SELECT pin, total_points FROM participants ORDER BY total_points DESC'
  ).all()

  const insert = db.prepare(`
    INSERT INTO leaderboard_snapshots (id, match_id, pin, cumulative_points, rank)
    VALUES (?, ?, ?, ?, ?)
  `)

  const run = db.transaction(() => {
    participants.forEach((p, i) => {
      insert.run(uuidv4(), matchId, p.pin, p.total_points, i + 1)
    })
  })

  run()
}

module.exports = { saveSnapshot }
