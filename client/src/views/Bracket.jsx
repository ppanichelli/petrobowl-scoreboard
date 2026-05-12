import React, { useState, useEffect } from 'react'
import { useSocket } from '../hooks/useSocket'
import PublicPageShell from '../components/PublicPageShell'
import './Bracket.css'

const SLOT_LABELS = {
  QF1: 'QF 1', QF2: 'QF 2', QF3: 'QF 3', QF4: 'QF 4',
  WBS1: 'SEMI 1', WBS2: 'SEMI 2',
  GF: 'GRAND FINAL', '3P': '3RD PLACE',
  LBS1: 'LB SEMI 1', LBS2: 'LB SEMI 2',
  LBF: '5TH PLACE',
}

// Which seed slots feed each QF (must match server/src/lib/bracket.js BRACKET_CONFIG)
const QF_SEEDS = {
  QF1: { a: 'seed_1a', b: 'seed_2c' },
  QF2: { a: 'seed_1b', b: 'seed_2d' },
  QF3: { a: 'seed_1c', b: 'seed_2a' },
  QF4: { a: 'seed_1d', b: 'seed_2b' },
}

function TeamRow({ team, score, tbScore, isWinner, isLoser, showScore }) {
  const scoreStr = tbScore !== null && tbScore !== undefined
    ? `${score} (${tbScore})`
    : showScore ? score : '—'

  return (
    <div className={`bn-row ${isWinner ? 'bn-row--winner' : ''} ${isLoser ? 'bn-row--loser' : ''}`}>
      {team ? (
        <>
          <img className="bn-logo" src={team.logo} alt="" onError={e => { e.target.style.display = 'none' }} />
          <span className="bn-name">{team.short}</span>
          <span className="bn-score">{scoreStr}</span>
        </>
      ) : (
        <>
          <span className="bn-logo bn-logo--tbd" />
          <span className="bn-name bn-name--tbd">TBD</span>
          <span className="bn-score">—</span>
        </>
      )}
    </div>
  )
}

function BracketNode({ match }) {
  if (!match) {
    return (
      <div className="bracket-node bracket-node--empty">
        <TeamRow team={null} score={0} tbScore={null} />
        <TeamRow team={null} score={0} tbScore={null} />
      </div>
    )
  }

  const finished = match.status === 'finished'
  const live = match.status === 'live'
  const showScore = live || finished
  const winnerIsA = finished && match.winner_id === match.team_a_id
  const winnerIsB = finished && match.winner_id === match.team_b_id

  const teamA = match.team_a_short ? { short: match.team_a_short, logo: match.team_a_logo } : null
  const teamB = match.team_b_short ? { short: match.team_b_short, logo: match.team_b_logo } : null

  return (
    <div className={`bracket-node ${live ? 'bracket-node--live' : ''} ${finished ? 'bracket-node--finished' : ''}`}>
      {live && <span className="bn-live-dot" />}
      <TeamRow team={teamA} score={match.score_a} tbScore={match.tiebreaker_score_a ?? null}
        isWinner={winnerIsA} isLoser={finished && !winnerIsA} showScore={showScore} />
      <TeamRow team={teamB} score={match.score_b} tbScore={match.tiebreaker_score_b ?? null}
        isWinner={winnerIsB} isLoser={finished && !winnerIsB} showScore={showScore} />
    </div>
  )
}

function Conn() {
  return (
    <div className="conn">
      <div className="conn__spcr" />
      <div className="conn__top" />
      <div className="conn__bot" />
      <div className="conn__spcr" />
    </div>
  )
}

export default function Bracket() {
  const [data, setData] = useState({ slots: {}, matches: [] })
  const socket = useSocket('join_bracket', 'leave_bracket')

  useEffect(() => {
    fetch('/api/bracket').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socket) return
    const handler = state => setData(state)
    socket.on('bracket:updated', handler)
    return () => socket.off('bracket:updated', handler)
  }, [socket])

  const m = {}
  for (const match of data.matches || []) m[match.bracket_slot] = match

  // For QF slots with no match yet, synthesise a display object from seed assignments
  function qfDisplay(slot) {
    if (m[slot]) return m[slot]
    const seeds = QF_SEEDS[slot]
    if (!seeds) return null
    const sa = data.slots?.[seeds.a]
    const sb = data.slots?.[seeds.b]
    if (!sa && !sb) return null
    return {
      status: 'setup',
      team_a_id: sa?.team_id ?? null,
      team_b_id: sb?.team_id ?? null,
      team_a_short: sa?.short_name ?? null,
      team_a_logo: sa?.logo_small_url ?? null,
      team_b_short: sb?.short_name ?? null,
      team_b_logo: sb?.logo_small_url ?? null,
      score_a: 0, score_b: 0,
      winner_id: null, is_draw: false,
      tiebreaker_score_a: null, tiebreaker_score_b: null,
    }
  }

  const gfFinished  = m.GF?.status === 'finished'
  const tpFinished  = m['3P']?.status === 'finished'
  const lbfFinished = m.LBF?.status === 'finished'
  const gfWinnerA   = gfFinished  && m.GF?.winner_id === m.GF?.team_a_id
  const tpWinnerA   = tpFinished  && m['3P']?.winner_id === m['3P']?.team_a_id
  const lbfWinnerA  = lbfFinished && m.LBF?.winner_id === m.LBF?.team_a_id

  return (
    <PublicPageShell>
      <div className="bracket">

        {/* Page header — matches the GROUP A / LEADERBOARD headers on sibling pages */}
        <div className="bracket__header">
          <h1 className="bracket__title">Brackets</h1>
          <span className="bracket__subtitle">Knockout Stage</span>
          <img className="bracket__header-logo" src="/assets/images/PETROBOWL 2026 LOGO.png" alt="Petrobowl 2026" />
        </div>

        {/* ── WINNER BRACKET ───────────────────────────────────────── */}
        <section className="bracket__panel bracket__panel--wb">
          <img className="bracket__wb-regionals" src="/assets/images/The-Regionals.png" alt="" />
          <h2 className="bracket__panel-heading">Winner Bracket</h2>

          <div className="wb">
            {/* Column headers */}
            <div className="wb-headers">
              <div className="wb-hdr wb-hdr--qf">QUARTER FINALS</div>
              <div className="wb-hdr-spacer" />
              <div className="wb-hdr wb-hdr--semi">SEMI FINALS</div>
              <div className="wb-hdr-spacer" />
            </div>

            {/* Bracket body */}
            <div className="wb-body">

              {/* QF column */}
              <div className="wb-col wb-col--qf">
                <div className="wb-slot"><BracketNode match={qfDisplay('QF1')} /></div>
                <div className="wb-slot"><BracketNode match={qfDisplay('QF2')} /></div>
                <div className="wb-slot"><BracketNode match={qfDisplay('QF3')} /></div>
                <div className="wb-slot"><BracketNode match={qfDisplay('QF4')} /></div>
              </div>

              {/* QF → Semi connector */}
              <div className="wb-connectors">
                <Conn />
                <Conn />
              </div>

              {/* Semi column */}
              <div className="wb-col wb-col--semi">
                <div className="wb-slot wb-slot--double wb-slot--semifinal">
                  <BracketNode match={m.WBS1} />
                </div>
                <div className="wb-slot wb-slot--double wb-slot--semifinal">
                  <BracketNode match={m.WBS2} />
                </div>
              </div>

              {/* Semi → Finals connector */}
              <div className="wb-connectors wb-connectors--full">
                <Conn />
              </div>

              {/* Finals column: GF top half, 3P bottom half */}
              <div className="wb-col wb-col--finals">
                <div className="wb-hdr wb-hdr--finals">GRAND FINAL</div>
                <div className="wb-slot wb-slot--double wb-slot--center wb-slot--final">
                  <BracketNode match={m.GF} />
                  {gfFinished && (
                    <div className="wb-places">
                      <span className={`wb-place ${gfWinnerA ? 'wb-place--gold' : 'wb-place--silver'}`}>
                        {`${gfWinnerA ? '1ST' : '2ND'} — ${m.GF.team_a_short}`}
                      </span>
                      <span className={`wb-place ${gfWinnerA ? 'wb-place--silver' : 'wb-place--gold'}`}>
                        {`${gfWinnerA ? '2ND' : '1ST'} — ${m.GF.team_b_short}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="wb-hdr wb-hdr--3p">3RD PLACE</div>
                <div className="wb-slot wb-slot--double wb-slot--center wb-slot--3p">
                  <BracketNode match={m['3P']} />
                  {tpFinished && (
                    <div className="wb-places">
                      <span className={`wb-place ${tpWinnerA ? 'wb-place--bronze' : 'wb-place--4th'}`}>
                        {`${tpWinnerA ? '3RD' : '4TH'} — ${m['3P'].team_a_short}`}
                      </span>
                      <span className={`wb-place ${tpWinnerA ? 'wb-place--4th' : 'wb-place--bronze'}`}>
                        {`${tpWinnerA ? '4TH' : '3RD'} — ${m['3P'].team_b_short}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── LOSER BRACKET ────────────────────────────────────────── */}
        <section className="bracket__panel bracket__panel--lb">
          <img className="bracket__lb-championship" src="/assets/images/PETROBOWL CHAMPIONSHIP.png" alt="" />
          <img className="bracket__lb-buenos-aires" src="/assets/images/BUENOS AIRES.png" alt="" />
          <div className="lb-divider">
            <span className="lb-divider__label">Loser Bracket</span>
          </div>

          <div className="lb">
            {/* LB Semi column */}
            <div className="lb-col">
              <div className="lb-hdr">LB SEMIS</div>
              <div className="lb-slots">
                <div className="lb-slot"><BracketNode match={m.LBS1} /></div>
                <div className="lb-slot"><BracketNode match={m.LBS2} /></div>
              </div>
            </div>

            {/* LB connector */}
            <div className="lb-conn">
              <Conn />
            </div>

            {/* 5th/6th column */}
            <div className="lb-col lb-col--final">
              <div className="lb-hdr">5TH PLACE</div>
              <div className="lb-slots lb-slots--center">
                <BracketNode match={m.LBF} />
                {lbfFinished && (
                  <div className="lb-places">
                    {lbfWinnerA ? (
                      <span className="lb-place lb-place--active">{`5TH — ${m.LBF.team_a_short}`}</span>
                    ) : (
                      <span className="lb-place lb-place--active">6TH</span>
                    )}
                    {!lbfWinnerA ? (
                      <span className="lb-place lb-place--active">{`5TH — ${m.LBF.team_b_short}`}</span>
                    ) : (
                      <span className="lb-place lb-place--active">6TH</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicPageShell>
  )
}
