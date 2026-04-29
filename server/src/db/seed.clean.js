/**
 * Seed teams and pins without anything else.
 * Run:  node server/src/db/seed.clean.js
 *
 * Safe to run on an existing database — it wipes all tables first, then
 * re-inserts everything. The 500 participant PINs are loaded from
 * server/data/pins_2026-04-11T05-46-29-064Z.txt — the exact list issued at
 * the 2026-04-11 tournament.
 */

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
db.pragma('foreign_keys = OFF') // disable while wiping

// ── Wipe all tables in dependency order ───────────────────────────────────────
db.prepare('DELETE FROM leaderboard_snapshots').run()
db.prepare('DELETE FROM prospects').run()
db.prepare('DELETE FROM actions').run()
db.prepare('DELETE FROM matches').run()
db.prepare('DELETE FROM participants').run()
db.prepare('DELETE FROM admin_users').run()
db.prepare('DELETE FROM teams').run()
console.log('Tables cleared.')

db.pragma('foreign_keys = ON')

// ── Teams ─────────────────────────────────────────────────────────────────────
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
  { id: 'udo-mon', full_name: 'Universidad de Oriente (Monagas)', short_name: 'UDO-MON', city: 'Maturín', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-mon.png',   logo_small_url: '/assets/logos/udo-mon_small.png'   },
  { id: 'unco', full_name: 'Universidad Nacional del Comahue', short_name: 'UNCO', city: 'Neuquén', country: 'Argentina',    country_code: 'AR', logo_url: '/assets/logos/unco.png',   logo_small_url: '/assets/logos/unco_small.png'   },
  { id: 'uerj', full_name: 'Universidade do Estado do Rio de Janeiro', short_name: 'UERJ', city: 'Rio de Janeiro', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/uerj.png',   logo_small_url: '/assets/logos/uerj_small.png'   },
  { id: 'udo-anz', full_name: 'Universidad de Oriente (Anzoategui)', short_name: 'UDO-ANZ', city: 'Cumaná', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-anz.png',   logo_small_url: '/assets/logos/udo-anz_small.png'   },
  { id: 'iupsm', full_name: 'Politécnico Santiago Mariño', short_name: 'IUPSM', city: 'Mérida', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/iupsm.png',   logo_small_url: '/assets/logos/iupsm_small.png'   },
  { id: 'luz', full_name: 'Universidad del Zulia', short_name: 'LUZ', city: 'Maracaibo', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/luz.png',   logo_small_url: '/assets/logos/luz_small.png'   },
]

const insertTeam = db.prepare(`
  INSERT INTO teams (id, full_name, short_name, city, country, country_code, logo_url, logo_small_url)
  VALUES (@id, @full_name, @short_name, @city, @country, @country_code, @logo_url, @logo_small_url)
`)
for (const t of teams) insertTeam.run(t)
console.log(`Teams: ${teams.length} inserted`)

// ── Admin user ────────────────────────────────────────────────────────────────
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const hash = bcrypt.hashSync(adminPassword, 10)
db.prepare(`INSERT INTO admin_users (id, username, password_hash) VALUES (?, 'admin', ?)`).run(uuidv4(), hash)
console.log('Admin user: seeded')

// ── Participants — 5 real profiles + 495 fresh PINs ───────────────────────────
const insertPin = db.prepare(`INSERT OR IGNORE INTO participants (pin) VALUES (?)`)
const allPins = [
  '162027','365878','963683','968197','625569','086977','833861','430453','318276','196104',
  '805506','932512','480745','019668','551653','979411','688631','760289','703177','986135',
  '420053','944433','102119','064709','527273','008583','389364','052030','768346','042662',
  '913249','690071','439817','781113','562342','167036','327488','795815','883662','482135',
  '009586','975219','077281','292345','279159','205150','851071','421639','413277','325876',
  '826791','801661','963740','947063','882753','339703','527712','798135','339385','144029',
  '454905','659785','087126','165554','277024','378286','650754','547976','679346','729877',
  '660110','751114','441919','115056','994974','638213','097954','362634','837385','804960',
  '299387','582702','892073','326750','714929','536589','932164','519152','038145','523285',
  '165625','332848','432945','749017','735384','267928','167245','614661','915923','796796',
  '886565','507888','491574','820952','904517','966337','152367','027213','026442','102944',
  '600931','403726','759827','759336','333364','442531','282111','140849','729854','278692',
  '155154','747379','179422','946550','621531','689790','332326','764810','155648','222046',
  '104723','253751','192661','490281','474800','624689','946155','257639','879960','639296',
  '898123','741763','458694','693230','078890','223264','154381','009639','681139','323773',
  '575243','381872','296197','831346','263984','404424','495005','176364','468336','432173',
  '698810','690189','969319','020822','618730','961945','315876','313179','274480','570508',
  '455612','418650','228751','577844','732973','638092','967240','199483','008028','846446',
  '604284','958597','057634','549282','303856','426803','949004','026164','307811','662645',
  '996770','756640','323350','616559','824616','155041','147298','070720','458217','153872',
  '879130','563076','706932','313942','902468','384207','882639','459916','126131','890939',
  '224229','310594','877743','880166','458686','286041','945033','104689','718165','115832',
  '979486','937363','547989','358565','596792','035655','331709','934595','727187','168902',
  '708123','093025','509044','720004','085241','904582','045925','397280','911440','127931',
  '456121','067514','474237','354397','326984','171339','576298','730939','001785','633068',
  '659703','869739','580031','602198','265409','636570','922836','214557','398376','604755',
  '923985','965809','120744','956937','066045','888578','920001','127265','997950','567449',
  '461724','537700','928868','253496','571477','734336','283300','934355','748673','710494',
  '139091','378631','814919','078904','506697','441993','680553','669653','283137','917872',
  '637228','010922','579236','137477','537725','881982','321724','907565','571283','881220',
  '058527','621433','273555','357642','717406','863896','778820','977312','704572','764979',
  '856806','806102','075130','535958','933788','103663','510867','227301','421866','634762',
  '638013','839175','700094','420085','635128','019203','923417','342251','618126','409859',
  '160419','788114','852667','575460','766089','050942','247874','565523','868231','136111',
  '432426','186546','191850','363074','373437','257198','092155','547357','646680','282256',
  '179300','394222','528390','919663','760355','187209','814625','413458','075032','260290',
  '139998','732875','798943','817455','021863','140239','949074','322101','900412','327313',
  '524873','159934','310703','194940','490404','384964','795690','248317','272155','658962',
  '285458','416136','127303','896982','489695','651266','452920','773379','274440','365468',
  '755217','838478','122061','860134','863148','316116','011970','141403','753588','250721',
  '416549','838310','715765','986701','924335','377412','946846','504423','213122','410799',
  '748563','124773','938550','384242','265082','402625','238238','756382','911093','931538',
  '352482','428863','328918','277007','142550','719477','707569','559266','782699','693416',
  '995661','788376','149837','274033','534799','600376','034834','655463','301918','288714',
  '044350','080879','090468','162668','445314','994157','158839','577439','313773','497488',
  '000714','624563','092119','089590','708834','899051','235449','129277','675104','931242',
  '911754','381634','360604','870247','179831','736556','825977','265890','233052','397754',
  '242443','253795','339742','474833','333228','121211','621315','449639','425534','613967',
  '346850','281858','584988','469838','676958','838118','204723','639277','842734','517970',
  '717150','966001','447429','343552','213719','459452','388989','668218','811890','467155',
]
const fillPins = db.transaction(() => {
  for (const pin of allPins) {
    insertPin.run(pin)
  }
})
fillPins()
console.log(`Participants: ${allPins.length} PINs added`)

// ── Matches ───────────────────────────────────────────────────────────────────
// No matches inserted

// ── Actions ───────────────────────────────────────────────────────────────────
// No actions inserted

// ── Prospects ─────────────────────────────────────────────────────────────────
// No Prospects inserted

db.close()
console.log('Snapshot seed complete →', DB_PATH)
