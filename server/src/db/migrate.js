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

db.close()
console.log('Migration complete →', DB_PATH)
