import React, { useEffect, useState, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import TeamSide from '../components/TeamSide'
import QuestionTrack from '../components/QuestionTrack'
import ProspectBar from '../components/ProspectBar'
import MatchResult from '../components/MatchResult'
import NextMatchBanner from '../components/NextMatchBanner'
import './Scoreboard.css'

export default function Scoreboard() {
  const [match, setMatch]     = useState(null)
  const [actions, setActions] = useState([])
  const [nextMatch, setNextMatch] = useState(null)
  const [flashA, setFlashA]   = useState(false)
  const [flashB, setFlashB]   = useState(false)
  const prevScoreA = useRef(0)
  const prevScoreB = useRef(0)
  const matchIdRef = useRef(null)
  const nextMatchIdRef = useRef(null)

  const socket = useSocket()

  useEffect(() => {
    fetch('/api/matches/live')
      .then(r => r.json())
      .then(data => {
        if (data) { setMatch(data.match); setActions(data.actions) }
      })
    fetch('/api/matches/next').then(r => r.json()).then(nm => {
      setNextMatch(nm)
      // Will join odds room once socket is ready (handled in socket effect)
    })
  }, [])

  // Keep refs in sync so reconnect handler always has current ids
  useEffect(() => { matchIdRef.current = match?.id ?? null }, [match?.id])
  useEffect(() => { nextMatchIdRef.current = nextMatch?.id ?? null }, [nextMatch?.id])

  useEffect(() => {
    if (!socket) return

    const handleScore = ({ match: m, actions: a }) => {
      if (m.score_a !== prevScoreA.current) {
        setFlashA(true)
        setTimeout(() => setFlashA(false), 900)
      }
      if (m.score_b !== prevScoreB.current) {
        setFlashB(true)
        setTimeout(() => setFlashB(false), 900)
      }
      prevScoreA.current = m.score_a
      prevScoreB.current = m.score_b
      setMatch(m)
      setActions(a)
    }

    const handleStarted = (m) => { setMatch(m); setNextMatch(null) }
    const handleFinished = (m) => {
      setMatch(m)
      fetch('/api/matches/next').then(r => r.json()).then(nm => {
        setNextMatch(nm)
        // Join odds room for the new next match so we get live updates
        if (nm?.id) socket.emit('join_odds', nm.id)
      })
    }

    // Live odds updates for the pre-match prospect bar
    const handleOdds = ({ match_id, oddsA, oddsB, votes_a, votes_b }) => {
      setNextMatch(prev => {
        if (!prev || prev.id !== match_id) return prev
        return { ...prev, odds_a: oddsA, odds_b: oddsB, votes_a, votes_b }
      })
    }

    // Re-join rooms whenever socket reconnects (rooms are lost on disconnect)
    const handleReconnect = () => {
      if (matchIdRef.current) socket.emit('join_match', matchIdRef.current)
      if (nextMatchIdRef.current) socket.emit('join_odds', nextMatchIdRef.current)
    }

    socket.on('score_update', handleScore)
    socket.on('match_started', handleStarted)
    socket.on('match_finished', handleFinished)
    socket.on('odds_update', handleOdds)
    socket.on('connect', handleReconnect)

    if (match?.id) socket.emit('join_match', match.id)

    return () => {
      socket.off('score_update', handleScore)
      socket.off('match_started', handleStarted)
      socket.off('match_finished', handleFinished)
      socket.off('odds_update', handleOdds)
      socket.off('connect', handleReconnect)
    }
  }, [socket, match?.id])

  // Join odds room for pre-match prospect bar live updates
  useEffect(() => {
    if (socket && nextMatch?.id) socket.emit('join_odds', nextMatch.id)
  }, [socket, nextMatch?.id])

  const streakA = calcStreak(actions, 'a')
  const streakB = calcStreak(actions, 'b')
  const questionsDone = countQuestionsDone(actions)

  if (!match && nextMatch) {
    return <NextMatchBanner match={nextMatch} />
  }

  if (!match) {
    return (
      <div className="scoreboard scoreboard--idle">
        <img className="idle-logo" src="/assets/images/PETROBOWL 2026 LOGO.png" alt="PetroBowl 2026" />
        <img className="idle-regionals" src="/assets/images/The-Regionals.png" alt="The Regionals" />
        <p className="idle-text">Waiting for match to begin…</p>
      </div>
    )
  }

  const scoreA = match.score_a
  const scoreB = match.score_b
  const isLeadingA = scoreA > scoreB
  const isLeadingB = scoreB > scoreA

  return (
    <div className="scoreboard">

      {/* Broadcast header strip */}
      <div className="scoreboard__header">
        <img
          className="scoreboard__header-logo scoreboard__header-logo--primary"
          src="/assets/images/PETROBOWL 2026 LOGO.png"
          alt="PetroBowl 2026"
        />
        <div className="scoreboard__header-center">
          <span className="scoreboard__stage">{formatStage(match.stage)}</span>
        </div>
        <img
          className="scoreboard__header-logo scoreboard__header-logo--regionals"
          src="/assets/images/The-Regionals.png"
          alt="The Regionals"
        />
      </div>

      {/* Main confrontation row */}
      <div className="scoreboard__main">
        <TeamSide
          side="a"
          shortName={match.team_a_short}
          fullName={match.team_a_full}
          countryCode={match.team_a_cc}
          logoUrl={match.team_a_logo}
          streak={streakA}
          isLeading={isLeadingA}
          isTrailing={isLeadingB}
        />

        {/* Score panel */}
        <div className="score-panel">
          <div className="score-panel__numbers">
            <div className={[
              'score-digit',
              flashA        ? 'score--flash'   : '',
              isLeadingA    ? 'score--leading'  : '',
              isLeadingB    ? 'score--trailing' : '',
            ].filter(Boolean).join(' ')}>
              {scoreA}
            </div>
            <div className="score-panel__sep" />
            <div className={[
              'score-digit',
              flashB        ? 'score--flash'   : '',
              isLeadingB    ? 'score--leading'  : '',
              isLeadingA    ? 'score--trailing' : '',
            ].filter(Boolean).join(' ')}>
              {scoreB}
            </div>
          </div>
          <div className="score-panel__progress">
            {questionsDone > 0
              ? `Q ${questionsDone} · ${match.total_questions - questionsDone} remaining`
              : `${match.total_questions} questions`
            }
          </div>
        </div>

        <TeamSide
          side="b"
          shortName={match.team_b_short}
          fullName={match.team_b_full}
          countryCode={match.team_b_cc}
          logoUrl={match.team_b_logo}
          streak={streakB}
          isLeading={isLeadingB}
          isTrailing={isLeadingA}
        />
      </div>

      {/* Question tracks */}
      <div className="scoreboard__tracks">
        <QuestionTrack team="a" label={match.team_a_short} total={match.total_questions} actions={actions} />
        <QuestionTrack team="b" label={match.team_b_short} total={match.total_questions} actions={actions} />
      </div>

      {(streakA >= 3 || streakB >= 3) && (
        <div className="streak-badge">
          {streakA >= 5 || streakB >= 5
            ? `${streakA >= 5 ? match.team_a_short : match.team_b_short} ON FIRE`
            : `${streakA >= 3 ? match.team_a_short : match.team_b_short} on a streak`
          }
        </div>
      )}

      {match.status === 'live' && match.frozen_odds_a && (
        <ProspectBar
          variant="live"
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

function countQuestionsDone(actions) {
  let q = 0
  let pendingRebuttal = null
  for (const a of actions) {
    if (a.action_type === 'correct_a' || a.action_type === 'correct_b') {
      q++; pendingRebuttal = null
    } else if (a.action_type === 'skip') {
      q++; pendingRebuttal = null
    } else if (a.action_type === 'incorrect_a') {
      if (pendingRebuttal === 'b') { q++; pendingRebuttal = null } else pendingRebuttal = 'a'
    } else if (a.action_type === 'incorrect_b') {
      if (pendingRebuttal === 'a') { q++; pendingRebuttal = null } else pendingRebuttal = 'b'
    }
  }
  return q
}

function formatStage(stage) {
  const map = {
    group:       'Group Stage',
    quarterfinal:'Quarterfinal',
    semifinal:   'Semifinal',
    third_place: 'Third Place',
    final:       'Grand Final',
    tiebreaker:  'Tiebreaker',
  }
  return map[stage] || stage
}
