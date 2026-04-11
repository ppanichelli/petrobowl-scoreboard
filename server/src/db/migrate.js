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
]
for (const stmt of alterations) {
  try { db.exec(stmt) } catch (e) { /* column already exists — safe to ignore */ }
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
