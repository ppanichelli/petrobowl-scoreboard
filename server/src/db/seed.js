require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })
const Database = require('better-sqlite3')
const bcrypt   = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs   = require('fs')

const DATA_DIR = path.resolve(__dirname, '../../data')
const DB_PATH  = path.join(DATA_DIR, 'pb.db')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Teams ──────────────────────────────────────────────────────────────────
const teams = [
  { id: 'ufrj', full_name: 'Universidade Federal do Rio de Janeiro', short_name: 'UFRJ', city: 'Rio de Janeiro', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/ufrj.png' },
  { id: 'itba', full_name: 'Instituto Tecnológico de Buenos Aires',   short_name: 'ITBA', city: 'Buenos Aires',   country: 'Argentina', country_code: 'AR', logo_url: '/assets/logos/itba.png' },
  { id: 'ug',   full_name: 'University of Guyana',                    short_name: 'UG',   city: 'Georgetown',     country: 'Guyana',    country_code: 'GY', logo_url: '/assets/logos/ug.png'   },
]

const insertTeam = db.prepare(`
  INSERT OR IGNORE INTO teams (id, full_name, short_name, city, country, country_code, logo_url)
  VALUES (@id, @full_name, @short_name, @city, @country, @country_code, @logo_url)
`)
for (const t of teams) insertTeam.run(t)
console.log(`Teams: ${teams.length} upserted`)

// ── Admin user ─────────────────────────────────────────────────────────────
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const hash = bcrypt.hashSync(adminPassword, 10)

db.prepare(`
  INSERT OR IGNORE INTO admin_users (id, username, password_hash)
  VALUES (?, 'admin', ?)
`).run(uuidv4(), hash)
console.log('Admin user: seeded (INSERT OR IGNORE)')

// ── PIN codes ──────────────────────────────────────────────────────────────
const TARGET_PINS = 500
const insertPin = db.prepare(`INSERT OR IGNORE INTO participants (pin) VALUES (?)`)

const existing = db.prepare('SELECT COUNT(*) AS c FROM participants').get().c
const needed   = TARGET_PINS - existing

if (needed > 0) {
  const generated = new Set()

  // Collect already-existing PINs to avoid duplicates
  const existingPins = new Set(
    db.prepare('SELECT pin FROM participants').all().map(r => r.pin)
  )

  const insertMany = db.transaction(() => {
    let count = 0
    while (count < needed) {
      const pin = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
      if (!existingPins.has(pin) && !generated.has(pin)) {
        generated.add(pin)
        insertPin.run(pin)
        count++
      }
    }
  })
  insertMany()
  console.log(`PINs: ${needed} new codes generated (total target: ${TARGET_PINS})`)
} else {
  console.log(`PINs: already have ${existing} codes, skipping`)
}

db.close()
console.log('Seed complete →', DB_PATH)
