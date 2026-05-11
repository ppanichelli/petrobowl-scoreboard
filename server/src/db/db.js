const Database = require('better-sqlite3')
const path = require('path')
const fs   = require('fs')

const DATA_DIR = path.resolve(__dirname, '../../data')
const DB_PATH  = path.join(DATA_DIR, 'pb.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Runtime migration: add bracket_slot column if not present (safe on existing DBs)
try { db.exec('ALTER TABLE matches ADD COLUMN bracket_slot TEXT') } catch (_) {}

module.exports = db
