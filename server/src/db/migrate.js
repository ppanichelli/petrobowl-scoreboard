require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DATA_DIR = path.resolve(__dirname, '../../data')
const DB_PATH  = path.join(DATA_DIR, 'pb.db')
const SCHEMA   = path.resolve(__dirname, 'schema.sql')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const sql = fs.readFileSync(SCHEMA, 'utf8')
db.exec(sql)

// Add columns that may not exist in older databases
const alterations = [
  `ALTER TABLE teams ADD COLUMN logo_small_url TEXT NOT NULL DEFAULT '/assets/logos/default_small.png'`,
  `ALTER TABLE matches ADD COLUMN group_name TEXT`,
  `ALTER TABLE matches ADD COLUMN bracket_slot TEXT`,
]
for (const stmt of alterations) {
  try { db.exec(stmt) } catch (e) { /* column already exists — safe to ignore */ }
}

// Extend matches.stage CHECK to include loser_bracket (requires table recreation in SQLite)
const matchesDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='matches'").get()
if (matchesDef && !matchesDef.sql.includes('loser_bracket')) {
  db.pragma('foreign_keys = OFF')
  db.exec(`
    CREATE TABLE matches_migrated (
      id                  TEXT PRIMARY KEY,
      team_a_id           TEXT NOT NULL REFERENCES teams(id),
      team_b_id           TEXT NOT NULL REFERENCES teams(id),
      stage               TEXT NOT NULL CHECK(stage IN ('group','quarterfinal','semifinal','third_place','final','tiebreaker','loser_bracket')),
      total_questions     INTEGER NOT NULL,
      status              TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup','live','finished')),
      score_a             INTEGER NOT NULL DEFAULT 0,
      score_b             INTEGER NOT NULL DEFAULT 0,
      winner_id           TEXT REFERENCES teams(id),
      is_draw             INTEGER NOT NULL DEFAULT 0,
      parent_match_id     TEXT REFERENCES matches_migrated(id),
      batch_id            TEXT,
      prospecting_open    INTEGER NOT NULL DEFAULT 1,
      frozen_odds_a       INTEGER,
      frozen_odds_b       INTEGER,
      frozen_prospects_a  INTEGER,
      frozen_prospects_b  INTEGER,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at         TEXT,
      group_name          TEXT,
      bracket_slot        TEXT
    );
    INSERT INTO matches_migrated SELECT * FROM matches;
    DROP TABLE matches;
    ALTER TABLE matches_migrated RENAME TO matches;
  `)
  db.pragma('foreign_keys = ON')
  console.log('Migration: matches.stage constraint updated — loser_bracket added')
}

// Backfill logo_small_url for seeded teams still carrying the generic default.
// Safe to run multiple times — the WHERE clause only touches rows that haven't been set yet.
const logoSmallPaths = [
  { id: 'ufrj', logo_small_url: '/assets/logos/ufrj_small.png' },
  { id: 'itba', logo_small_url: '/assets/logos/itba_small.png' },
  { id: 'ug',   logo_small_url: '/assets/logos/ug_small.png'   },
]
const updateLogoSmall = db.prepare(
  `UPDATE teams SET logo_small_url = @logo_small_url
   WHERE id = @id AND logo_small_url = '/assets/logos/default_small.png'`
)
for (const row of logoSmallPaths) updateLogoSmall.run(row)
console.log('logo_small_url backfill: done')

db.close()
console.log('Migration complete →', DB_PATH)
