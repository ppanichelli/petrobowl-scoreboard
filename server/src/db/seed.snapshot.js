/**
 * Snapshot seed — restores the database to the state captured on 2026-04-19.
 * Run:  node server/src/db/seed.snapshot.js
 *
 * Safe to run on an existing database — it wipes all tables first, then
 * re-inserts everything. The 500 participant PINs are loaded from
 * server/data/pins_2026-04-11T05-46-29-064Z.txt — the exact list issued at
 * the 2026-04-11 tournament. The 5 PINs that carry real names / points /
 * prospects are inserted first with full profile data; the remaining 495
 * are inserted as bare PINs.
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
  { id: 'udo-mon', full_name: 'Universidad de Oriente (Monagas)', short_name: 'UDO-M', city: 'Maturín', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-mon.png',   logo_small_url: '/assets/logos/udo-mon_small.png'   },
  { id: 'unco', full_name: 'Universidad Nacional del Comahue', short_name: 'UNCO', city: 'Neuquén', country: 'Argentina',    country_code: 'AR', logo_url: '/assets/logos/unco.png',   logo_small_url: '/assets/logos/unco_small.png'   },
  { id: 'uerj', full_name: 'Universidade do Estado do Rio de Janeiro', short_name: 'UERJ', city: 'Rio de Janeiro', country: 'Brazil',    country_code: 'BR', logo_url: '/assets/logos/uerj.png',   logo_small_url: '/assets/logos/uerj_small.png'   },
  { id: 'udo-anz', full_name: 'Universidad de Oriente (Anzoategui)', short_name: 'UDO-A', city: 'Cumaná', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/udo-anz.png',   logo_small_url: '/assets/logos/udo-anz_small.png'   },
  { id: 'psm', full_name: 'Politécnico Santiago Mariño', short_name: 'PSM', city: 'Mérida', country: 'Venezuela',    country_code: 'VE', logo_url: '/assets/logos/psm.png',   logo_small_url: '/assets/logos/psm_small.png'   },
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
const knownParticipants = [
  { pin: '913249', display_name: 'Billy',    country_code: 'EC', total_points: 2, created_at: '2026-04-11 05:46:29', first_login_at: '2026-04-11 05:53:55' },
  { pin: '086977', display_name: 'Jonas',    country_code: 'TT', total_points: 0, created_at: '2026-04-11 05:46:29', first_login_at: '2026-04-11 14:05:51' },
  { pin: '318276', display_name: 'Patricio', country_code: 'AR', total_points: 0, created_at: '2026-04-11 05:46:29', first_login_at: '2026-04-11 18:41:18' },
  { pin: '389364', display_name: 'Patricio', country_code: 'AR', total_points: 0, created_at: '2026-04-11 05:46:29', first_login_at: '2026-04-11 19:48:54' },
  { pin: '805506', display_name: 'Rodrigo',  country_code: 'BR', total_points: 0, created_at: '2026-04-11 05:46:29', first_login_at: '2026-04-12 21:02:49' },
]
const insertParticipant = db.prepare(`
  INSERT INTO participants (pin, display_name, country_code, total_points, created_at, first_login_at)
  VALUES (@pin, @display_name, @country_code, @total_points, @created_at, @first_login_at)
`)
for (const p of knownParticipants) insertParticipant.run(p)

const knownPins = new Set(knownParticipants.map(p => p.pin))
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
    if (!knownPins.has(pin)) insertPin.run(pin)
  }
})
fillPins()
console.log(`Participants: 5 real profiles + ${allPins.length - knownPins.size} PINs (total: ${allPins.length})`)

// ── Matches ───────────────────────────────────────────────────────────────────
const matches = [
  {
    id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', team_a_id: 'itba', team_b_id: 'ufrj',
    stage: 'group', total_questions: 10, status: 'finished',
    score_a: 100, score_b: 0, winner_id: 'itba', is_draw: 0,
    parent_match_id: null, batch_id: '801bbf53-2618-4a9d-ac11-8c5cc025c89b',
    prospecting_open: 0, frozen_odds_a: 2, frozen_odds_b: 2,
    frozen_prospects_a: 0, frozen_prospects_b: 0,
    created_at: '2026-04-11 05:49:02', finished_at: '2026-04-11 05:53:12',
  },
  {
    id: 'f0cf480b-93f4-4041-802c-783ca22913d3', team_a_id: 'ufrj', team_b_id: 'ug',
    stage: 'group', total_questions: 15, status: 'finished',
    score_a: 50, score_b: 45, winner_id: 'ufrj', is_draw: 0,
    parent_match_id: null, batch_id: '801bbf53-2618-4a9d-ac11-8c5cc025c89b',
    prospecting_open: 0, frozen_odds_a: 1, frozen_odds_b: 10,
    frozen_prospects_a: 1, frozen_prospects_b: 0,
    created_at: '2026-04-11 05:49:02', finished_at: '2026-04-11 12:14:39',
  },
  {
    id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'group', total_questions: 15, status: 'finished',
    score_a: 35, score_b: 35, winner_id: null, is_draw: 1,
    parent_match_id: null, batch_id: '884f4012-a84e-45f0-bc48-28a61113228e',
    prospecting_open: 0, frozen_odds_a: 10, frozen_odds_b: 1,
    frozen_prospects_a: 0, frozen_prospects_b: 1,
    created_at: '2026-04-11 12:14:56', finished_at: '2026-04-11 12:20:37',
  },
  {
    id: '3a3f3829-7cb3-488d-97d8-4336127e7370', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'tiebreaker', total_questions: 5, status: 'finished',
    score_a: 30, score_b: 20, winner_id: 'itba', is_draw: 0,
    parent_match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0',
    batch_id: '884f4012-a84e-45f0-bc48-28a61113228e',
    prospecting_open: 0, frozen_odds_a: 2, frozen_odds_b: 2,
    frozen_prospects_a: 0, frozen_prospects_b: 0,
    created_at: '2026-04-11 12:20:47', finished_at: '2026-04-11 12:22:44',
  },
  {
    id: '0308d74d-80cc-401e-ba67-658bbad98d89', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'group', total_questions: 15, status: 'finished',
    score_a: 0, score_b: 0, winner_id: null, is_draw: 1,
    parent_match_id: null, batch_id: '75cc4a5c-00bc-4a97-917b-655b3ea839e3',
    prospecting_open: 0, frozen_odds_a: 2, frozen_odds_b: 2,
    frozen_prospects_a: 0, frozen_prospects_b: 0,
    created_at: '2026-04-11 12:23:20', finished_at: '2026-04-11 12:23:55',
  },
  {
    id: 'd435e473-288c-4fff-9173-8e37e9e58699', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'quarterfinal', total_questions: 15, status: 'finished',
    score_a: 0, score_b: 0, winner_id: null, is_draw: 1,
    parent_match_id: null, batch_id: '75cc4a5c-00bc-4a97-917b-655b3ea839e3',
    prospecting_open: 0, frozen_odds_a: 1, frozen_odds_b: 10,
    frozen_prospects_a: 1, frozen_prospects_b: 0,
    created_at: '2026-04-11 12:23:20', finished_at: '2026-04-11 12:27:09',
  },
  {
    id: '485bf7a0-378d-45ab-9a1f-a464470f177e', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'group', total_questions: 15, status: 'finished',
    score_a: 45, score_b: 35, winner_id: 'itba', is_draw: 0,
    parent_match_id: null, batch_id: '96ef82ea-1462-4dae-8099-224d565971a3',
    prospecting_open: 0, frozen_odds_a: 1, frozen_odds_b: 10,
    frozen_prospects_a: 1, frozen_prospects_b: 0,
    created_at: '2026-04-11 12:27:05', finished_at: '2026-04-11 13:08:48',
  },
  {
    id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', team_a_id: 'itba', team_b_id: 'ug',
    stage: 'quarterfinal', total_questions: 15, status: 'finished',
    score_a: 90, score_b: 45, winner_id: 'itba', is_draw: 0,
    parent_match_id: null, batch_id: '96ef82ea-1462-4dae-8099-224d565971a3',
    prospecting_open: 0, frozen_odds_a: 10, frozen_odds_b: 1,
    frozen_prospects_a: 0, frozen_prospects_b: 1,
    created_at: '2026-04-11 12:27:05', finished_at: '2026-04-11 18:41:00',
  },
  {
    id: '4408c026-4021-4a3a-834d-c8b3cf267158', team_a_id: 'itba', team_b_id: 'ufrj',
    stage: 'final', total_questions: 15, status: 'live',
    score_a: 70, score_b: 5, winner_id: null, is_draw: 0,
    parent_match_id: null, batch_id: '3d594842-0cf1-44d6-ab60-8082c06bdb5e',
    prospecting_open: 0, frozen_odds_a: 2, frozen_odds_b: 2,
    frozen_prospects_a: 1, frozen_prospects_b: 1,
    created_at: '2026-04-11 14:25:55', finished_at: null,
  },
  {
    id: 'a6367e41-f19b-4988-b8bb-0b1a5b0941f8', team_a_id: 'itba', team_b_id: 'ufrj',
    stage: 'final', total_questions: 15, status: 'setup',
    score_a: 0, score_b: 0, winner_id: null, is_draw: 0,
    parent_match_id: null, batch_id: '5f03606e-ff51-4066-871c-b01e744e318a',
    prospecting_open: 1, frozen_odds_a: null, frozen_odds_b: null,
    frozen_prospects_a: null, frozen_prospects_b: null,
    created_at: '2026-04-11 18:43:09', finished_at: null,
  },
]
const insertMatch = db.prepare(`
  INSERT INTO matches
    (id, team_a_id, team_b_id, stage, total_questions, status, score_a, score_b,
     winner_id, is_draw, parent_match_id, batch_id, prospecting_open,
     frozen_odds_a, frozen_odds_b, frozen_prospects_a, frozen_prospects_b,
     created_at, finished_at)
  VALUES
    (@id, @team_a_id, @team_b_id, @stage, @total_questions, @status, @score_a, @score_b,
     @winner_id, @is_draw, @parent_match_id, @batch_id, @prospecting_open,
     @frozen_odds_a, @frozen_odds_b, @frozen_prospects_a, @frozen_prospects_b,
     @created_at, @finished_at)
`)
for (const m of matches) insertMatch.run(m)
console.log(`Matches: ${matches.length} inserted`)

// ── Actions ───────────────────────────────────────────────────────────────────
const actions = [
  // match: b415d4ec (ITBA vs UFRJ, group, finished — ITBA 100:0)
  { id: '96698f13-112c-4aa7-92ef-36effad9118d', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 1,  question_number: 1,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:51:57' },
  { id: 'd0f2a676-1371-4590-8060-8266fde44d6a', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 2,  question_number: 2,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:07' },
  { id: '4f4ecf74-a8af-402e-8462-6622455bcdc1', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 3,  question_number: 3,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:07' },
  { id: '9cb18b27-2259-42cc-bbfc-968bd935aa54', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 4,  question_number: 4,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:07' },
  { id: '814d1a71-fc01-4cbc-a79a-6d9f638a2734', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 5,  question_number: 5,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:08' },
  { id: '121a0dd3-dbe4-49f6-bc02-9c058494ff2a', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 6,  question_number: 6,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:08' },
  { id: '833d82f1-464b-49a3-9900-c72d00281ee6', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 7,  question_number: 7,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:09' },
  { id: 'fad50f3d-0095-4996-91c3-71b4dbc22826', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 8,  question_number: 8,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:09' },
  { id: '5431f805-e4d0-4c76-9fb9-7297a5122b36', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 9,  question_number: 9,  action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:09' },
  { id: '95a2d1d0-bd65-4b69-93a2-3e435ad13add', match_id: 'b415d4ec-fa19-4e32-8078-2169b07d7ff0', sequence: 10, question_number: 10, action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 05:53:12' },

  // match: f0cf480b (UFRJ vs UG, group, finished — UFRJ 50:45)
  { id: 'c10fd228-8a9e-414d-a490-9c7e70251b78', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 1,  question_number: 1,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 06:04:08' },
  { id: 'ecd90962-c201-4710-8e2a-623f0d6057c9', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 2,  question_number: 2,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:08' },
  { id: '4fe6fc76-b00d-4d26-9b40-294b39dc98f8', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 3,  question_number: 3,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 06:04:09' },
  { id: 'f55b8442-736f-4214-9570-166b3ba17fd9', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 4,  question_number: 4,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 06:04:09' },
  { id: '2ddb37b1-053a-4c1d-aa8c-5f7cc98e9206', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 5,  question_number: 5,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:10' },
  { id: 'f82fb06a-65d5-421a-b37a-27a5559a1d2d', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 6,  question_number: 6,  action_type: 'incorrect_b', is_undone: 1, created_at: '2026-04-11 06:04:11' },
  { id: 'a890421b-297b-4ce6-a1c7-3de6c9aa2737', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 7,  question_number: 6,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 06:04:12' },
  { id: '88d4656b-235b-494c-a5d6-99f904f15cf5', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 8,  question_number: 7,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:13' },
  { id: '6ab6485c-c7ab-415a-8866-147cde261ca3', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 9,  question_number: 8,  action_type: 'incorrect_a', is_undone: 1, created_at: '2026-04-11 06:04:13' },
  { id: 'd97a6096-25dd-4cbc-a57e-cd653e7aacbd', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 10, question_number: 8,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 06:04:14' },
  { id: 'fbeb4dc1-6492-4f19-a51a-5131bfd7284d', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 11, question_number: 1,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 06:04:19' },
  { id: 'a437bfd3-e54d-426d-8540-6c30693f4a28', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 12, question_number: 2,  action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 06:04:20' },
  { id: '784c54c4-8ac5-49ba-930e-ea730001f8e4', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 13, question_number: 3,  action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 06:04:20' },
  { id: '6a403562-cfee-4501-8a94-2e879e61c0ee', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 14, question_number: 3,  action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 06:04:21' },
  { id: '143769cc-fd73-44f5-bca4-d71e3fa91994', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 15, question_number: 4,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 06:04:22' },
  { id: 'a3a674ec-4d0c-4cb0-8b38-b0f354e64d56', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 16, question_number: 5,  action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 06:04:23' },
  { id: '852073ad-bf54-4db2-b2b4-244d439acf44', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 17, question_number: 6,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 06:04:24' },
  { id: '4888ed8c-1dbb-4152-9070-c59edc92ee62', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 18, question_number: 7,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 06:04:25' },
  { id: 'ad4abdfc-5401-47e3-933d-81fdf413e487', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 19, question_number: 7,  action_type: 'incorrect_a', is_undone: 1, created_at: '2026-04-11 06:04:26' },
  { id: '7f28aa95-f756-4c71-97a9-25b40b299308', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 20, question_number: 7,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 06:04:26' },
  { id: '7a753300-4a35-44b9-846b-dd76a28a8b17', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 21, question_number: 8,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:27' },
  { id: '26f6f301-0323-4ab1-9336-c1d10d70f6cc', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 22, question_number: 9,  action_type: 'incorrect_b', is_undone: 1, created_at: '2026-04-11 06:04:27' },
  { id: '014a003b-467d-4637-b02c-44c28b143b2f', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 23, question_number: 9,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 06:04:28' },
  { id: '44f17f03-8e4d-4541-8a5f-3a6cd700b937', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 24, question_number: 10, action_type: 'incorrect_a', is_undone: 1, created_at: '2026-04-11 06:04:28' },
  { id: 'eb21d24f-43e1-43cd-8c2d-cd502500c764', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 25, question_number: 10, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:29' },
  { id: '9759398c-b201-4e3c-b37f-e07288d87f07', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 26, question_number: 11, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:29' },
  { id: 'b9d15e25-f863-4413-99a0-a45f0d4a892c', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 27, question_number: 12, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:29' },
  { id: 'c1a5bec3-4e9b-4415-8ec4-eb0c359d2bdb', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 28, question_number: 13, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:31' },
  { id: '734d2398-56d5-4d61-bf1a-b51a2f79dfe0', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 29, question_number: 14, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 06:04:32' },
  { id: 'fe8251cf-2051-4309-9c68-332e9c7d95ed', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 30, question_number: 11, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:25' },
  { id: 'd07a5235-0563-44cf-b995-65e64d081f33', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 31, question_number: 12, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:26' },
  { id: 'b4cf861e-75ac-4ee1-a86c-fc14d7a3034e', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 32, question_number: 13, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:36' },
  { id: '98680cbd-7860-4639-9acf-b613cba0c0d5', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 33, question_number: 14, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:38' },
  { id: '75d69ff3-4829-491a-aa98-7a1c2c086dc1', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 34, question_number: 12, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:47' },
  { id: 'ab0993a5-cc8a-459f-892a-18cee8f942a6', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 35, question_number: 13, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:48' },
  { id: 'e2b257a3-d38e-418a-9656-a6588ad8fbc5', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 36, question_number: 14, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 09:52:48' },
  { id: '27219256-43a6-4e84-ac90-bac75f377a0b', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 37, question_number: 6,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 09:53:45' },
  { id: '9d275358-3c47-4fe2-97e5-c0f6f23f7800', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 38, question_number: 7,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 09:53:46' },
  { id: 'd7e56d0c-1666-472a-9761-48c33edea5fa', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 39, question_number: 8,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 09:53:46' },
  { id: '0e6207f3-91e2-45b0-b0b2-fbd0ea606723', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 40, question_number: 9,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 09:53:46' },
  { id: 'bb4a6075-0550-41fd-b0f4-b98a0980eb23', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 41, question_number: 10, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 09:53:50' },
  { id: '13023d3e-7cd3-4854-9077-213e5151d8e6', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 42, question_number: 11, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:14:24' },
  { id: 'b32c7aae-8a53-4df2-84ff-7394e9ac6160', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 43, question_number: 12, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:14:25' },
  { id: '8a5b0855-194d-42e6-bdf2-457f373d2e27', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 44, question_number: 13, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:14:28' },
  { id: '65a52a39-18d1-4ed3-a768-073a82627c1a', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 45, question_number: 14, action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 12:14:32' },
  { id: '4119fe69-5efc-40da-bbaf-2cfaf19b7359', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 46, question_number: 14, action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 12:14:36' },
  { id: '52104e99-4ead-4cfa-936e-a7d33a05d45f', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', sequence: 47, question_number: 15, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:14:39' },

  // match: 58f9d8ca (ITBA vs UG, group draw, finished — 35:35)
  { id: 'ab54b338-bec4-48a5-99b1-eed177c0a34a', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 1,  question_number: 1,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:16:02' },
  { id: 'f95a8dd7-579f-4815-8f91-3112efef7fed', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 2,  question_number: 2,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 12:16:04' },
  { id: 'e9e129ea-af3f-4540-8da5-81186524f9ad', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 3,  question_number: 3,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:16:07' },
  { id: 'd7177347-b1a7-464d-a25d-d0517fe97a46', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 4,  question_number: 4,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 12:16:09' },
  { id: '6831ac6a-d62d-4d82-9582-90f60e7c23b2', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 5,  question_number: 5,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:16:11' },
  { id: '8ece0104-b934-4671-91be-c40f193d15e8', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 6,  question_number: 6,  action_type: 'incorrect_b', is_undone: 1, created_at: '2026-04-11 12:16:13' },
  { id: 'b85dee21-d2c7-49f1-b92d-300dc4f185f5', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 7,  question_number: 6,  action_type: 'incorrect_a', is_undone: 1, created_at: '2026-04-11 12:16:16' },
  { id: '89f038cb-fa1e-4bdf-b88d-bf57f3aea818', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 8,  question_number: 7,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 12:16:17' },
  { id: '5ac9afdc-0095-4736-a952-e699b92f8b39', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 9,  question_number: 8,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:17:23' },
  { id: '848734c0-88b2-42b8-8b1e-f7f34e30c2e7', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 10, question_number: 9,  action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:17:27' },
  { id: '209e6097-9576-4444-8c82-2aa04d8cee70', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 11, question_number: 10, action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 12:18:02' },
  { id: 'bd16f7aa-dca7-47c5-8ea4-06158c3d0cfd', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 12, question_number: 11, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:18:04' },
  { id: 'd6ef239e-7832-4777-884b-1aeceecfb785', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 13, question_number: 12, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:19:08' },
  { id: 'b0c29d36-2bb6-45fa-ab23-dd793a007ac6', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 14, question_number: 13, action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 12:19:10' },
  { id: '3f3bb335-4e5d-4877-8e85-7c209f16726d', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 15, question_number: 14, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-11 12:19:13' },
  { id: '42949859-9f40-4434-a07d-d78ef87f2c33', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 16, question_number: 2,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:20:07' },
  { id: 'a8d33014-f5cc-431b-868c-081fd2c9c696', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 17, question_number: 3,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 12:20:09' },
  { id: '57b65c60-426b-42c0-9748-e5faa0229852', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 18, question_number: 4,  action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 12:20:11' },
  { id: '4c5aa57e-49f2-423d-b170-1453421a40c6', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 19, question_number: 4,  action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 12:20:12' },
  { id: 'bd44ae3b-31fe-4417-9a54-c08013eef9a0', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 20, question_number: 5,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:20:14' },
  { id: '3e6c37ac-58e1-4762-9f63-ccdeeecd914a', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 21, question_number: 6,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:20:15' },
  { id: '85da709e-a90b-4b96-9ebc-9d2e4791be54', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 22, question_number: 7,  action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 12:20:16' },
  { id: '0a20fffa-cc1c-4ccc-9644-833617b65056', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 23, question_number: 7,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 12:20:18' },
  { id: '40005f8d-6252-4412-9cb8-1b13d8abfeb1', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 24, question_number: 8,  action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 12:20:20' },
  { id: '0f7836f4-8b14-412a-9e83-45fde8b320c3', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 25, question_number: 8,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 12:20:23' },
  { id: '6222a97a-b297-413a-9ae6-2f72c8917f14', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 26, question_number: 9,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 12:20:26' },
  { id: 'fb8ddff4-074e-4e7d-a573-f0e2d7ed3bf1', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 27, question_number: 10, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 12:20:31' },
  { id: '5916e7cf-32d3-4093-a01a-e306ab555559', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 28, question_number: 11, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 12:20:32' },
  { id: '1cf1bce0-bbcd-4140-b8b8-f7158cc51963', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 29, question_number: 12, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 12:20:32' },
  { id: '79febf17-d4c4-40c3-b9b6-eec4c0f2ca8e', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 30, question_number: 13, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 12:20:33' },
  { id: '21845cef-9961-4593-8ecb-dc906ce5bad6', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 31, question_number: 14, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 12:20:34' },
  { id: '1e774f31-56bb-4129-b621-c1c74a7a65c8', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', sequence: 32, question_number: 15, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 12:20:37' },

  // match: 3a3f3829 (ITBA vs UG, tiebreaker, finished — ITBA 30:20)
  { id: '1d5abc74-9de7-4383-9414-ad61934391e1', match_id: '3a3f3829-7cb3-488d-97d8-4336127e7370', sequence: 1, question_number: 1, action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 12:21:00' },
  { id: '52e2521f-6cc2-41f3-ab20-548f8aae967a', match_id: '3a3f3829-7cb3-488d-97d8-4336127e7370', sequence: 2, question_number: 2, action_type: 'correct_b', is_undone: 0, created_at: '2026-04-11 12:21:02' },
  { id: '9711a21f-eb03-4e6f-8f42-e994e1032b6e', match_id: '3a3f3829-7cb3-488d-97d8-4336127e7370', sequence: 3, question_number: 3, action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 12:21:06' },
  { id: '53b9b04d-a656-42da-a216-daa9d7c67220', match_id: '3a3f3829-7cb3-488d-97d8-4336127e7370', sequence: 4, question_number: 4, action_type: 'correct_b', is_undone: 0, created_at: '2026-04-11 12:22:41' },
  { id: '521e63e7-5f09-4e16-b3fa-8a5c8a6aa229', match_id: '3a3f3829-7cb3-488d-97d8-4336127e7370', sequence: 5, question_number: 5, action_type: 'correct_a', is_undone: 0, created_at: '2026-04-11 12:22:44' },

  // match: 485bf7a0 (ITBA vs UG, group, finished — ITBA 45:35)
  { id: '69133c8d-73df-460e-a52a-5872cad1b83a', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 1,  question_number: 1,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:11' },
  { id: '77ea6f6f-4a14-4179-9cc2-a8459545499f', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 2,  question_number: 2,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 13:08:13' },
  { id: 'e78d6b34-a68c-4bf6-85b0-3f51853b2819', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 3,  question_number: 3,  action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 13:08:16' },
  { id: 'c84afdf0-0657-4a89-a594-a2a1ff3468d0', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 4,  question_number: 3,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 13:08:21' },
  { id: '1b203318-97d7-4d3d-b1f0-a9eb50b85d92', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 5,  question_number: 4,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:24' },
  { id: '75695a86-614b-4c9f-beeb-835da6c745b8', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 6,  question_number: 5,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:25' },
  { id: '547c33c1-cad2-4bb7-9478-e7975d26e581', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 7,  question_number: 6,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:26' },
  { id: '7929a637-6c90-4b7c-a2b4-89bc0f9d10b9', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 8,  question_number: 7,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:26' },
  { id: '73f1eb26-05ca-4e94-90fd-c2198477c968', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 9,  question_number: 8,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 13:08:27' },
  { id: '4e392f4b-49e4-406e-a04b-821d471de104', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 10, question_number: 9,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 13:08:37' },
  { id: 'b25ac045-b65a-40cb-8089-38d04f170396', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 11, question_number: 10, action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 13:08:40' },
  { id: '9c0fba9f-8f99-4b84-9242-e313cf382449', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 12, question_number: 10, action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 13:08:41' },
  { id: 'ad7c5cde-292a-429a-ade5-004b28f3ad09', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 13, question_number: 11, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 13:08:43' },
  { id: 'dc703af6-4db9-4c39-9fd9-2097118c5c17', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 14, question_number: 12, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 13:08:43' },
  { id: '9ea08475-f849-465a-b054-4fb59a6fcee1', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 15, question_number: 13, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 13:08:44' },
  { id: '8536a716-2b49-41be-845e-95b72e0322fc', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 16, question_number: 14, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 13:08:45' },
  { id: 'b7de9249-d2a1-42bb-b697-23c1d35e8017', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 17, question_number: 15, action_type: 'incorrect_a', is_undone: 0, created_at: '2026-04-11 13:08:48' },
  { id: '2fe670e8-cd8a-4883-b3c3-0bcf312023de', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', sequence: 18, question_number: 15, action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 13:08:48' },

  // match: 152a3dde (ITBA vs UG, quarterfinal, finished — ITBA 90:45)
  { id: '81e058cc-c30a-4905-8d55-c85ca8c6f361', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 1,  question_number: 1,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 14:28:16' },
  { id: '4ce33a2e-5675-4a78-993b-c000c2b81cd8', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 2,  question_number: 2,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 14:28:19' },
  { id: '4ac3fcb4-990b-4b1a-82a8-e477c8e2ad63', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 3,  question_number: 3,  action_type: 'incorrect_a', is_undone: 1, created_at: '2026-04-11 14:28:21' },
  { id: '8a852f9b-e08a-4af9-862b-e94aa54a7af9', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 4,  question_number: 3,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 14:28:23' },
  { id: 'e13e934b-0d27-4d25-a568-5cd7142b0a9b', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 5,  question_number: 4,  action_type: 'skip',        is_undone: 1, created_at: '2026-04-11 14:28:24' },
  { id: 'fbb32eff-f2a1-4b7a-b8bb-86256eee2aae', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 6,  question_number: 3,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 15:31:58' },
  { id: '2790e49c-8eb1-4bf5-9d9c-58f73f68f7e9', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 7,  question_number: 4,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 15:32:02' },
  { id: '5c881aa8-e9cd-4616-a6ce-65d8b67ba4d1', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 8,  question_number: 5,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 15:32:04' },
  { id: 'ebf9d4ad-5078-45f6-9d14-8a0a0266a42a', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 9,  question_number: 6,  action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 15:32:06' },
  { id: 'cb8929eb-ec4a-4492-a6d8-73ecce512536', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 10, question_number: 6,  action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 15:32:08' },
  { id: '857420b6-ce79-4b9b-aefb-fbe88ed907a2', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 11, question_number: 7,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 15:32:10' },
  { id: '34623516-1985-432a-b79b-4b8a10fe80e9', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 12, question_number: 8,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 15:32:13' },
  { id: '5c854030-abf9-4b0e-96d9-d7304343784f', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 13, question_number: 9,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:39:28' },
  { id: 'fea9b828-44fa-4b80-adef-11968c152eb6', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 14, question_number: 10, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:39:29' },
  { id: '9995340a-658b-457b-bac9-fe8e4f02623a', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 15, question_number: 11, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:39:31' },
  { id: '23836d11-1aac-40e1-a888-dfe8c1473802', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 16, question_number: 12, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:39:35' },
  { id: '959d49ae-310a-4fea-a05c-df3beaedde40', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 17, question_number: 13, action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:39:38' },
  { id: 'be319837-d010-451e-920e-a924b1980e02', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 18, question_number: 14, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 18:40:58' },
  { id: 'aabd14d1-4503-4132-932e-223a0ab8c576', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', sequence: 19, question_number: 15, action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 18:41:00' },

  // match: 4408c026 (ITBA vs UFRJ, final, LIVE — ITBA 70:5)
  { id: 'e1a7d406-d748-4ba0-97aa-3f4979ecc60e', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 1,  question_number: 1,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:43:52' },
  { id: '1a649e28-50d7-4173-9e7d-9703795004b2', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 2,  question_number: 2,  action_type: 'correct_b',   is_undone: 0, created_at: '2026-04-11 18:43:54' },
  { id: '6d47f57e-054b-4e73-ab86-c37582ad105c', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 3,  question_number: 3,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 18:43:56' },
  { id: 'ad1eac8c-e39c-47a5-bef7-486f4283f78d', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 4,  question_number: 4,  action_type: 'incorrect_b', is_undone: 0, created_at: '2026-04-11 18:44:04' },
  { id: '2cd8f9b5-cd28-4fef-accf-139838a030b8', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 5,  question_number: 4,  action_type: 'skip',        is_undone: 0, created_at: '2026-04-11 18:44:07' },
  { id: '0bb44c30-c510-4934-9797-f9be3c60ccf0', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 6,  question_number: 5,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 19:45:57' },
  { id: 'c86e244e-596e-4a50-a134-508fa1a57537', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 7,  question_number: 6,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 19:45:57' },
  { id: 'fe2c20b4-446a-4e8f-8aef-28cbf532fda9', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 8,  question_number: 7,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 19:45:58' },
  { id: '6a979d55-52e1-4a66-96f2-e7a99041899a', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 9,  question_number: 8,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-11 19:46:01' },
  { id: '57482bb4-2234-481c-a415-3826a3397de1', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 10, question_number: 9,  action_type: 'correct_a',   is_undone: 1, created_at: '2026-04-11 19:46:02' },
  { id: '6a951cd5-5431-4a10-9950-486be528b2c9', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 11, question_number: 10, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-12 21:01:23' },
  { id: '5ef92ec9-108b-4a46-b075-80c9d19b9419', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 12, question_number: 11, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-12 21:01:31' },
  { id: 'a5434c67-86c3-43a7-a835-e66f719409ee', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 13, question_number: 12, action_type: 'correct_b',   is_undone: 1, created_at: '2026-04-12 21:01:33' },
  { id: '42bfefbf-2a86-4499-99dd-10d58341475c', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 14, question_number: 13, action_type: 'incorrect_b', is_undone: 1, created_at: '2026-04-12 21:01:37' },
  { id: '96e2a419-1fa7-47fd-9f41-2ff157e57875', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', sequence: 15, question_number: 9,  action_type: 'correct_a',   is_undone: 0, created_at: '2026-04-12 21:14:41' },
  // matches 0308d74d and d435e473 have no actions (0:0 draws, instant finish)
]
const insertAction = db.prepare(`
  INSERT INTO actions (id, match_id, sequence, question_number, action_type, is_undone, created_at)
  VALUES (@id, @match_id, @sequence, @question_number, @action_type, @is_undone, @created_at)
`)
const insertActions = db.transaction(() => { for (const a of actions) insertAction.run(a) })
insertActions()
console.log(`Actions: ${actions.length} inserted`)

// ── Prospects ─────────────────────────────────────────────────────────────────
const prospects = [
  { id: '3a0d1354-d7f1-4213-abda-1cecc2d49d16', pin: '913249', match_id: 'f0cf480b-93f4-4041-802c-783ca22913d3', prospected_team_id: 'ufrj', is_locked: 1, payout: 1,    created_at: '2026-04-11 05:54:07', updated_at: '2026-04-11 05:54:07' },
  { id: 'd84e0f4e-3e82-473c-80fd-1854807ab683', pin: '913249', match_id: '58f9d8ca-0bcd-4fbe-a3d9-27299e40d2a0', prospected_team_id: 'ug',   is_locked: 1, payout: 0,    created_at: '2026-04-11 12:15:17', updated_at: '2026-04-11 12:15:17' },
  { id: '9c548f96-d17d-4f11-a78f-6c4eb35c1633', pin: '913249', match_id: 'd435e473-288c-4fff-9173-8e37e9e58699', prospected_team_id: 'itba', is_locked: 1, payout: 0,    created_at: '2026-04-11 12:24:10', updated_at: '2026-04-11 12:24:10' },
  { id: 'b9dee1c5-c042-4643-b6e8-d649ca97d7ec', pin: '913249', match_id: '485bf7a0-378d-45ab-9a1f-a464470f177e', prospected_team_id: 'itba', is_locked: 1, payout: 1,    created_at: '2026-04-11 12:30:07', updated_at: '2026-04-11 13:07:43' },
  { id: '2d282aaf-c29e-46a0-86fd-e5489cc4d982', pin: '913249', match_id: '152a3dde-ad73-4db0-bea4-4c0d444b22bf', prospected_team_id: 'ug',   is_locked: 1, payout: 0,    created_at: '2026-04-11 13:07:09', updated_at: '2026-04-11 13:07:09' },
  { id: 'ec4e8757-857b-44ad-849f-fbc80796853d', pin: '086977', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', prospected_team_id: 'itba', is_locked: 1, payout: null, created_at: '2026-04-11 14:26:09', updated_at: '2026-04-11 14:29:16' },
  { id: '701e946b-2c22-4194-9803-169fcd15858c', pin: '318276', match_id: '4408c026-4021-4a3a-834d-c8b3cf267158', prospected_team_id: 'ufrj', is_locked: 1, payout: null, created_at: '2026-04-11 18:42:11', updated_at: '2026-04-11 18:42:11' },
  { id: '59a6413f-c00a-4f9e-9f18-e4e01fbe5117', pin: '389364', match_id: 'a6367e41-f19b-4988-b8bb-0b1a5b0941f8', prospected_team_id: 'ufrj', is_locked: 0, payout: null, created_at: '2026-04-11 19:49:42', updated_at: '2026-04-11 19:49:42' },
  { id: '4b921205-49a8-4106-98ec-c4ecbbc676bd', pin: '805506', match_id: 'a6367e41-f19b-4988-b8bb-0b1a5b0941f8', prospected_team_id: 'itba', is_locked: 0, payout: null, created_at: '2026-04-12 21:03:24', updated_at: '2026-04-12 21:03:24' },
]
const insertProspect = db.prepare(`
  INSERT INTO prospects (id, pin, match_id, prospected_team_id, is_locked, payout, created_at, updated_at)
  VALUES (@id, @pin, @match_id, @prospected_team_id, @is_locked, @payout, @created_at, @updated_at)
`)
for (const p of prospects) insertProspect.run(p)
console.log(`Prospects: ${prospects.length} inserted`)

db.close()
console.log('Snapshot seed complete →', DB_PATH)
