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
  { id: 'uba', full_name: 'Universidad de Buenos Aires', short_name: 'UBA', city: 'Buenos Aires', country: 'Argentina',    country_code: 'AR', logo_url: '/assets/logos/uba.png',   logo_small_url: '/assets/logos/uba_small.png'   },
  { id: 'itba', full_name: 'Instituto Tecnológico de Buenos Aires',   short_name: 'ITBA', city: 'Buenos Aires',   country: 'Argentina', country_code: 'AR', logo_url: '/assets/logos/itba.png',   logo_small_url: '/assets/logos/itba_small.png'   },
  { id: 'ug',   full_name: 'University of Guyana', short_name: 'UG',   city: 'Georgetown',     country: 'Guyana',    country_code: 'GY', logo_url: '/assets/logos/ug.png',     logo_small_url: '/assets/logos/ug_small.png'     },
  { id: 'unp',   full_name: 'Universidad Nacional de Piura', short_name: 'UNP',   city: 'Lima',     country: 'Peru',    country_code: 'PE', logo_url: '/assets/logos/unp.png',     logo_small_url: '/assets/logos/unp_small.png'     },
  { id: 'uni', full_name: 'Universidad Nacional de Ingenieria', short_name: 'UNI', city: 'Lima', country: 'Peru',    country_code: 'PE', logo_url: '/assets/logos/uni.png',   logo_small_url: '/assets/logos/uni_small.png'   },
  { id: 'unicamp', full_name: 'Universidade Estadual de Campinas', short_name: 'UNICAMP', city: 'Campinas', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/unicamp.png',   logo_small_url: '/assets/logos/unicamp_small.png'   },
  { id: 'adekus', full_name: 'Anton de Kom University', short_name: 'ADEKUS', city: 'Paramaribo', country: 'Suriname',    country_code: 'SR', logo_url: '/assets/logos/adekus.png',   logo_small_url: '/assets/logos/adekus_small.png'   },
  { id: 'uce', full_name: 'Universidad Central del Ecuador', short_name: 'UCE', city: 'Quito', country: 'Ecuador',    country_code: 'EC', logo_url: '/assets/logos/uce.png',   logo_small_url: '/assets/logos/uce_small.png'   },
  { id: 'ufrj', full_name: 'Universidade Federal do Rio de Janeiro', short_name: 'UFRJ', city: 'Rio de Janeiro', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/ufrj.png',   logo_small_url: '/assets/logos/ufrj_small.png'   },
  { id: 'uenf', full_name: 'Universidade Estadual do Norte Fluminense', short_name: 'UENF', city: 'Macaé', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/uenf.png',   logo_small_url: '/assets/logos/uenf_small.png'   },
  { id: 'espol', full_name: 'Escuela Superior Politécnica del Litoral', short_name: 'ESPOL', city: 'Guayaquil', country: 'Ecuador',    country_code: 'EC', logo_url: '/assets/logos/espol.png',   logo_small_url: '/assets/logos/espol_small.png'   },
  { id: 'epn', full_name: 'Escuela Politécnica Nacional', short_name: 'EPN', city: 'Quito', country: 'Ecuador',    country_code: 'EC', logo_url: '/assets/logos/epn.png',   logo_small_url: '/assets/logos/epn_small.png'   },
  { id: 'unifei', full_name: 'Universidade Federal de Itajubá', short_name: 'UNIFEI', city: 'Itajubá', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/unifei.png',   logo_small_url: '/assets/logos/unifei_small.png'   },
  { id: 'udo-mon', full_name: 'Universidad de Oriente (Monagas)', short_name: 'UDO-M', city: 'Maturín', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-mon.png',   logo_small_url: '/assets/logos/udo-mon_small.png'   },
  { id: 'unco', full_name: 'Universidad Nacional del Comahue', short_name: 'UNCO', city: 'Neuquén', country: 'Argentina',    country_code: 'AR', logo_url: '/assets/logos/unco.png',   logo_small_url: '/assets/logos/unco_small.png'   },
  { id: 'uerj', full_name: 'Universidade do Estado do Rio de Janeiro', short_name: 'UERJ', city: 'Rio de Janeiro', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/uerj.png',   logo_small_url: '/assets/logos/uerj_small.png'   },
  { id: 'udo-anz', full_name: 'Universidad de Oriente (Anzoategui)', short_name: 'UDO-A', city: 'Cumaná', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-anz.png',   logo_small_url: '/assets/logos/udo-anz_small.png'   },
  { id: 'psm', full_name: 'Politécnico Santiago Mariño', short_name: 'PSM', city: 'Mérida', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/psm.png',   logo_small_url: '/assets/logos/psm_small.png'   },
  { id: 'luz', full_name: 'Universidad del Zulia', short_name: 'LUZ', city: 'Maracaibo', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/luz.png',   logo_small_url: '/assets/logos/luz_small.png'   },
  { id: 'udesc', full_name: 'Universidade do Estado de Santa Catarina', short_name: 'UDESC', city: 'Florianópolis', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/udesc.png',   logo_small_url: '/assets/logos/udesc_small.png'   },
  { id: 'emi', full_name: 'Escuela Militar de Ingeniería', short_name: 'EMI', city: 'La Paz', country: 'Bolivia',    country_code: 'BO', logo_url: '/assets/logos/emi.png',   logo_small_url: '/assets/logos/emi_small.png'   },
]

const insertTeam = db.prepare(`
  INSERT OR IGNORE INTO teams (id, full_name, short_name, city, country, country_code, logo_url, logo_small_url)
  VALUES (@id, @full_name, @short_name, @city, @country, @country_code, @logo_url, @logo_small_url)
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
