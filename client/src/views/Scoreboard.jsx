import React, { useEffect, useState, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import TeamSide from '../components/TeamSide'
import QuestionTrack from '../components/QuestionTrack'
import ProspectBar from '../components/ProspectBar'
import MatchResult from '../components/MatchResult'
import NextMatchBanner from '../components/NextMatchBanner'
import './Scoreboard.css'

export default function Scoreboard() {
  const [match, setMatch]   = useState(null)
  const [actions, setActions] = useState([])
  const [nextMatch, setNextMatch] = useState(null)
  const [flashA, setFlashA] = useState(false)
  const [flashB, setFlashB] = useState(false)
  const prevScoreA = useRef(0)
  const prevScoreB = useRef(0)

  const socket = useSocket()

  // Initial fetch
  useEffect(() => {
    fetch('/api/matches/live')
      .then(r => r.json())
      .then(data => {
        if (data) { setMatch(data.match); setActions(data.actions) }
      })
    fetch('/api/matches/next').then(r => r.json()).then(setNextMatch)
  }, [])

  // Real-time updates
  useEffect(() => {
    if (!socket) return

    const handleScore = ({ match: m, actions: a }) => {
      if (m.score_a !== prevScoreA.current) {
        setFlashA(true)
        setTimeout(() => setFlashA(false), 800)
      }
      if (m.score_b !== prevScoreB.current) {
        setFlashB(true)
        setTimeout(() => setFlashB(false), 800)
      }
      prevScoreA.current = m.score_a
      prevScoreB.current = m.score_b
      setMatch(m)
      setActions(a)
    }

    const handleStarted = (m) => {
      setMatch(m)
      setNextMatch(null)
    }

    const handleFinished = (m) => {
      setMatch(m)
      // Refresh next match
      fetch('/api/matches/next').then(r => r.json()).then(setNextMatch)
    }

    socket.on('score_update', handleScore)
    socket.on('match_started', handleStarted)
    socket.on('match_finished', handleFinished)

    if (match?.id) socket.emit('join_match', match.id)

    return () => {
      socket.off('score_update', handleScore)
      socket.off('match_started', handleStarted)
      socket.off('match_finished', handleFinished)
    }
  }, [socket, match?.id])

  // Streak calculation
  const streakA = calcStreak(actions, 'a')
  const streakB = calcStreak(actions, 'b')

  if (!match && nextMatch) {
    return <NextMatchBanner match={nextMatch} />
  }

  if (!match) {
    return (
      <div className="scoreboard scoreboard--idle">
        <div className="idle-logo">
          <img src="/assets/petrobowl-logo.png" alt="PetroBowl" />
        </div>
        <p className="idle-text">Waiting for match to begin…</p>
      </div>
    )
  }

  return (
    <div className="scoreboard">
      <div className="scoreboard__stage">{formatStage(match.stage)}</div>

      <div className="scoreboard__main">
        <TeamSide
          side="a"
          shortName={match.team_a_short}
          fullName={match.team_a_full}
          countryCode={match.team_a_cc}
          logoUrl={match.team_a_logo}
          score={match.score_a}
          flash={flashA}
          streak={streakA}
        />

        <div className="scoreboard__center">
          <div className={`score score--a ${flashA ? 'score--flash' : ''}`}>{match.score_a}</div>
          <div className="score__sep">:</div>
          <div className={`score score--b ${flashB ? 'score--flash' : ''}`}>{match.score_b}</div>
        </div>

        <TeamSide
          side="b"
          shortName={match.team_b_short}
          fullName={match.team_b_full}
          countryCode={match.team_b_cc}
          logoUrl={match.team_b_logo}
          score={match.score_b}
          flash={flashB}
          streak={streakB}
        />
      </div>

      <div className="scoreboard__tracks">
        <QuestionTrack team="a" total={match.total_questions} actions={actions} />
        <QuestionTrack team="b" total={match.total_questions} actions={actions} />
      </div>

      {(streakA >= 3 || streakB >= 3) && (
        <div className="streak-badge">
          {streakA >= 5 || streakB >= 5 ? '🔥 ON FIRE!' : `🔥 ${streakA >= 3 ? match.team_a_short : match.team_b_short} on a streak!`}
        </div>
      )}

      {match.status === 'live' && match.frozen_odds_a && (
        <ProspectBar
          oddsA={match.frozen_odds_a}
          oddsB={match.frozen_odds_b}
          prospectsA={match.frozen_prospects_a}
          prospectsB={match.frozen_prospects_b}
          teamAShort={match.team_a_short}
          teamBShort={match.team_b_short}
        />
      )}

      {match.status === 'finished' && (
        <MatchResult match={match} />
      )}
    </div>
  )
}

function calcStreak(actions, team) {
  let streak = 0
  for (let i = actions.length - 1; i >= 0; i--) {
    const t = actions[i].action_type
    if (t === `correct_${team}`) streak++
    else break
  }
  return streak
}

function formatStage(stage) {
  const map = {
    group: 'Group Stage',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    third_place: 'Third Place',
    final: 'Grand Final',
    tiebreaker: 'Tiebreaker',
  }
  return map[stage] || stage
}
