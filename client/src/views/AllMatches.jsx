import React, { useEffect, useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import ProspectBar from '../components/ProspectBar'
import './AllMatches.css'

const STAGE_LABEL = {
  group: 'Group Stage', quarterfinal: 'Quarterfinal', semifinal: 'Semifinal',
  third_place: 'Third Place', final: 'Grand Final', tiebreaker: 'Tiebreaker',
}
const fmt = s => STAGE_LABEL[s] || s

export default function AllMatches() {
  const [upcoming, setUpcoming] = useState([])
  const [history,  setHistory]  = useState([])
  const socket = useSocket()

  useEffect(() => {
    fetch('/api/matches/upcoming').then(r => r.json()).then(setUpcoming)
    fetch('/api/matches/history').then(r => r.json()).then(setHistory)
  }, [])

  // Live odds updates for upcoming matches
  useEffect(() => {
    if (!socket || upcoming.length === 0) return
    upcoming.forEach(m => socket.emit('join_odds', m.id))
    const onOdds = ({ match_id, oddsA, oddsB, votes_a, votes_b }) => {
      setUpcoming(prev => prev.map(m =>
        m.id === match_id ? { ...m, odds_a: oddsA, odds_b: oddsB, votes_a, votes_b } : m
      ))
    }
    socket.on('odds_update', onOdds)
    return () => socket.off('odds_update', onOdds)
  }, [socket, upcoming.length])

  // Move match from upcoming to history when it finishes
  useEffect(() => {
    if (!socket) return
    const onFinished = (m) => {
      setUpcoming(prev => prev.filter(u => u.id !== m.id))
      setHistory(prev => [m, ...prev])
    }
    const onStarted = (m) => {
      setUpcoming(prev => prev.map(u => u.id === m.id ? { ...u, status: 'live' } : u))
    }
    socket.on('match_finished', onFinished)
    socket.on('match_started', onStarted)
    return () => {
      socket.off('match_finished', onFinished)
      socket.off('match_started', onStarted)
    }
  }, [socket])

  return (
    <div className="all-matches">
      <section className="all-matches__section">
        <h2 className="all-matches__heading">Upcoming &amp; Live</h2>
        {upcoming.length === 0
          ? <p className="all-matches__empty">No upcoming matches.</p>
          : upcoming.map((m, i) => <UpcomingCard key={m.id} m={m} index={i} />)
        }
      </section>

      <section className="all-matches__section">
        <h2 className="all-matches__heading">Completed</h2>
        {history.length === 0
          ? <p className="all-matches__empty">No completed matches yet.</p>
          : history.map((m, i) => <HistoryCard key={m.id} m={m} index={i} />)
        }
      </section>
    </div>
  )
}

function UpcomingCard({ m, index }) {
  const isLive = m.status === 'live'
  return (
    <div className={`am-card ${isLive ? 'am-card--live' : ''}`} style={{ '--card-i': index }}>
      <div className="am-card__stage">
        {isLive && <span className="am-card__live-dot" />}
        {fmt(m.stage)}
      </div>
      <div className="am-card__row">
        <div className="am-card__team">
          <span className={`fi fi-${m.team_a_cc?.toLowerCase()}`} />
          <span className="am-card__name">{m.team_a_short}</span>
          <span className="am-card__odds">{m.odds_a != null ? `${Number(m.odds_a).toFixed(1)}×` : '—'}</span>
        </div>
        <span className="am-card__vs">VS</span>
        <div className="am-card__team am-card__team--b">
          <span className="am-card__odds">{m.odds_b != null ? `${Number(m.odds_b).toFixed(1)}×` : '—'}</span>
          <span className="am-card__name">{m.team_b_short}</span>
          <span className={`fi fi-${m.team_b_cc?.toLowerCase()}`} />
        </div>
      </div>
      <div className="am-card__prospects">
        <ProspectBar
          variant={isLive ? 'live' : 'prematch'}
          oddsA={isLive ? m.frozen_odds_a : m.odds_a}
          oddsB={isLive ? m.frozen_odds_b : m.odds_b}
          prospectsA={isLive ? m.frozen_prospects_a : m.votes_a}
          prospectsB={isLive ? m.frozen_prospects_b : m.votes_b}
          teamAShort={m.team_a_short}
          teamBShort={m.team_b_short}
        />
      </div>
    </div>
  )
}

function HistoryCard({ m, index }) {
  const isDraw = m.is_draw
  const winnerA = !isDraw && m.winner_id === m.team_a_id
  const winnerB = !isDraw && m.winner_id === m.team_b_id
  return (
    <div className="am-card am-card--finished" style={{ '--card-i': index }}>
      <div className="am-card__stage">{fmt(m.stage)}</div>
      <div className="am-card__row">
        <div className={`am-card__team ${winnerA ? 'am-card__team--winner' : ''}`}>
          <span className={`fi fi-${m.team_a_cc?.toLowerCase()}`} />
          <span className="am-card__name">{m.team_a_short}</span>
          <span className="am-card__score">{m.score_a}</span>
        </div>
        <span className="am-card__vs">{isDraw ? 'DRAW' : 'VS'}</span>
        <div className={`am-card__team am-card__team--b ${winnerB ? 'am-card__team--winner' : ''}`}>
          <span className="am-card__score">{m.score_b}</span>
          <span className="am-card__name">{m.team_b_short}</span>
          <span className={`fi fi-${m.team_b_cc?.toLowerCase()}`} />
        </div>
      </div>
    </div>
  )
}
