import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import QuestionTrack, { buildDots } from '../components/QuestionTrack'
import PublicPageShell from '../components/PublicPageShell'
import './AllMatches.css'
import './MatchDetail.css'

const STAGE_LABEL = {
  group: 'Group Stage', quarterfinal: 'Quarterfinal', semifinal: 'Semifinal',
  third_place: 'Third Place', final: 'Grand Final', tiebreaker: 'Tiebreaker',
  loser_bracket: 'Loser Bracket',
}

export default function MatchDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/matches/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
  }, [id])

  if (error) return (
    <PublicPageShell>
      <div className="match-detail">
        <div className="md-header">
          <Link to="/matches" className="md-back">← All Matches</Link>
        </div>
        <p className="md-message">Match not found.</p>
      </div>
    </PublicPageShell>
  )

  if (!data) return (
    <PublicPageShell>
      <div className="match-detail">
        <div className="md-header">
          <Link to="/matches" className="md-back">← All Matches</Link>
        </div>
        <p className="md-message">Loading…</p>
      </div>
    </PublicPageShell>
  )

  const { match: m, actions } = data
  const isDraw   = m.is_draw
  const winnerA  = !isDraw && m.winner_id === m.team_a_id
  const winnerB  = !isDraw && m.winner_id === m.team_b_id
  const hasScore = m.status === 'finished' || m.status === 'live'

  return (
    <PublicPageShell>
      <div className="match-detail">

        <div className="md-header">
          <Link to="/matches" className="md-back">← All Matches</Link>
          <span className="md-stage">{STAGE_LABEL[m.stage] || m.stage}</span>
        </div>

        {/* Score card — reuses am-card visual language */}
        <div className="md-scoreboard am-card">
          <div className="am-card__row">
            <div className={`am-card__team${winnerA ? ' am-card__team--winner' : winnerB ? ' am-card__team--loser' : ''}`}>
              <TeamLogo small={m.team_a_logo_small} full={m.team_a_logo} alt={m.team_a_short} />
              <span className="am-card__name">{m.team_a_short}</span>
              <span className={`am-card__flag fi fi-${m.team_a_cc?.toLowerCase()}`} />
            </div>
            <div className="am-card__center">
              {hasScore ? (
                <>
                  <span className={`am-card__score md-score${winnerA ? ' am-card__score--winner' : winnerB ? ' am-card__score--loser' : ''}`}>
                    {m.score_a}
                  </span>
                  <span className="am-card__vs">{isDraw ? 'DRAW' : '–'}</span>
                  <span className={`am-card__score md-score${winnerB ? ' am-card__score--winner' : winnerA ? ' am-card__score--loser' : ''}`}>
                    {m.score_b}
                  </span>
                </>
              ) : (
                <span className="am-card__vs">VS</span>
              )}
            </div>
            <div className={`am-card__team am-card__team--b${winnerB ? ' am-card__team--winner' : winnerA ? ' am-card__team--loser' : ''}`}>
              <span className={`am-card__flag fi fi-${m.team_b_cc?.toLowerCase()}`} />
              <span className="am-card__name">{m.team_b_short}</span>
              <TeamLogo small={m.team_b_logo_small} full={m.team_b_logo} alt={m.team_b_short} />
            </div>
          </div>
        </div>

        {/* Score progression chart */}
        {actions.length > 0 && (
          <section className="md-progress">
            <h2 className="all-matches__heading">Progress</h2>
            <ScoreProgressionChart
              total={m.total_questions}
              actions={actions}
              teamAShort={m.team_a_short}
              teamBShort={m.team_b_short}
              teamACc={m.team_a_cc}
              teamBCc={m.team_b_cc}
            />
          </section>
        )}

        {/* Question breakdown */}
        {actions.length > 0 && (
          <section className="md-questions">
            <h2 className="all-matches__heading">Questions</h2>
            {/* Horizontal tracks — always on desktop, also on mobile for ≤20 questions */}
            <div className={`md-tracks${m.total_questions > 20 ? ' md-tracks--many' : ''}`}>
              <QuestionTrack team="a" label={m.team_a_short} total={m.total_questions} actions={actions} />
              <QuestionTrack team="b" label={m.team_b_short} total={m.total_questions} actions={actions} />
            </div>
            {/* Two-column grid — mobile only, >20 questions */}
            {m.total_questions > 20 && (
              <MobileQuestionGrid
                total={m.total_questions}
                actions={actions}
                teamAShort={m.team_a_short}
                teamBShort={m.team_b_short}
              />
            )}
          </section>
        )}

      </div>
    </PublicPageShell>
  )
}

function ScoreProgressionChart({ total, actions, teamAShort, teamBShort, teamACc, teamBCc }) {
  const dotsA = buildDots('a', total, actions)
  const dotsB = buildDots('b', total, actions)

  // Build cumulative score arrays, stopping at the last answered question
  const cumA = [0], cumB = [0]
  for (let i = 0; i < total; i++) {
    if (dotsA[i] === 'empty' && dotsB[i] === 'empty') break
    cumA.push(cumA[cumA.length - 1] + (dotsA[i] === 'correct' ? 10 : dotsA[i] === 'incorrect' ? -5 : 0))
    cumB.push(cumB[cumB.length - 1] + (dotsB[i] === 'correct' ? 10 : dotsB[i] === 'incorrect' ? -5 : 0))
  }

  const n = cumA.length
  if (n < 2) return null

  const W = 600, H = 220
  const PAD = { top: 20, right: 20, bottom: 45, left: 35 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom

  const allVals = [...cumA, ...cumB]
  const rawMin = Math.min(0, ...allVals)
  const rawMax = Math.max(10, ...allVals)
  const range  = rawMax - rawMin
  const step   = range <= 30 ? 10 : range <= 70 ? 20 : 30
  const yMin   = Math.floor(rawMin / step) * step
  const yMax   = Math.ceil(rawMax / step) * step
  const yRange = (yMax - yMin) || 10

  const xS = i => PAD.left + (i / (n - 1)) * iW
  const yS = v => PAD.top + iH - ((v - yMin) / yRange) * iH
  const pts = arr => arr.map((v, i) => `${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ')

  const gridLines = []
  for (let v = yMin; v <= yMax; v += step) gridLines.push(v)

  return (
    <div className="md-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ display: 'block' }}>
        {/* Horizontal gridlines */}
        {gridLines.map(v => (
          <line key={v}
            x1={PAD.left}        y1={yS(v).toFixed(1)}
            x2={PAD.left + iW}   y2={yS(v).toFixed(1)}
            stroke={v === 0 ? 'var(--chart-zero)' : 'var(--chart-grid)'}
            strokeWidth={v === 0 ? 1 : 0.75}
            strokeDasharray={v === 0 ? '4 4' : '3 3'}
          />
        ))}

        {/* X-axis baseline */}
        <line
          x1={PAD.left}       y1={(PAD.top + iH).toFixed(1)}
          x2={PAD.left + iW}  y2={(PAD.top + iH).toFixed(1)}
          stroke="var(--chart-axis)"
          strokeWidth={1}
        />

        {/* Team A line */}
        <polyline points={pts(cumA)} fill="none"
          stroke="var(--pb-blue-mid)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Team B line */}
        <polyline points={pts(cumB)} fill="none"
          stroke="var(--pb-gold)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis label */}
        <text x={W / 2} y={H - 10} textAnchor="middle" className="md-chart__xlabel">
          QUESTION
        </text>
      </svg>
      <div className="md-chart__legend">
        <div className="md-chart__legend-item">
          <span className="md-chart__legend-line md-chart__legend-line--a" />
          <span className={`fi fi-${teamACc?.toLowerCase()}`} />
          <span className="md-chart__legend-name">{teamAShort}</span>
        </div>
        <div className="md-chart__legend-item">
          <span className="md-chart__legend-line md-chart__legend-line--b" />
          <span className={`fi fi-${teamBCc?.toLowerCase()}`} />
          <span className="md-chart__legend-name">{teamBShort}</span>
        </div>
      </div>
    </div>
  )
}

function MobileQuestionGrid({ total, actions, teamAShort, teamBShort }) {
  const dotsA = buildDots('a', total, actions)
  const dotsB = buildDots('b', total, actions)
  return (
    <div className="md-qgrid">
      <div className="md-qgrid__header">
        <span>{teamAShort}</span>
        <span>{teamBShort}</span>
      </div>
      <div className="md-qgrid__dots">
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <span
              className={`q-dot q-dot--${dotsA[i]}`}
              style={{ '--i': i }}
              title={`Q${i + 1}: ${dotsA[i]}`}
            />
            <span
              className={`q-dot q-dot--${dotsB[i]}`}
              style={{ '--i': i }}
              title={`Q${i + 1}: ${dotsB[i]}`}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function TeamLogo({ small, full, alt }) {
  const src = small || full
  if (!src) return null
  return (
    <img
      className="am-card__logo md-logo"
      src={src}
      alt={alt}
      onError={e => {
        if (full && e.target.src !== full) {
          e.target.src = full
        } else {
          e.target.style.display = 'none'
        }
      }}
    />
  )
}
