import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './ParticipantHelp.css'

const STEPS = [
  {
    num: '01',
    title: 'USE YOUR PIN TO LOGIN',
    body: 'At check-in you received a 6-digit PIN. Enter it to access your personal Prospector account.',
    img: '/assets/images/help/help-01-login.png',
    alt: 'Login screen',
  },
  {
    num: '02',
    title: 'PLACE YOUR PROSPECTS',
    body: 'Before a match starts, pick the team you think will win. Tap a team, then hit Save Prospect to lock it in.',
    img: '/assets/images/help/help-02-prospect.png',
    alt: 'Prospect selection screen',
  },
  {
    num: '03',
    title: 'COMMUNITY ODDS UPDATE IN REAL TIME',
    body: 'See how everyone is betting before kickoff. The less popular your pick, the bigger the payout if you\'re right.',
    img: '/assets/images/help/help-03-odds.png',
    alt: 'Community odds on the scoreboard',
  },
  {
    num: '04',
    title: 'RANK TO THE TOP',
    body: 'The public leaderboard shows who\'s called the most matches correctly. Can you crack the top 3?',
    img: '/assets/images/help/help-04-leaderboard.png',
    alt: 'Top prospectors leaderboard',
  },
  {
    num: '05',
    title: 'FOLLOW LIVE MATCHES',
    body: 'Once a match is live, watch the score update question by question on the main screen.',
    img: '/assets/images/help/help-05-live.png',
    alt: 'Live match scoreboard',
  },
  {
    num: '06',
    title: 'CHECK GROUP STANDINGS',
    body: 'Browse the group tables to see how teams are stacking up across the tournament.',
    img: '/assets/images/help/help-06-standings.png',
    alt: 'Group stage standings table',
  },
  {
    num: '07',
    title: 'DIVE INTO MATCH DETAILS',
    body: 'Tap any match to see the full score progression, question breakdown, and final results.',
    img: '/assets/images/help/help-07-results.png',
    alt: 'Individual match detail view',
  },
]

export default function ParticipantHelp() {
  const navigate = useNavigate()
  const stepRefs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('p-help__step--visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    stepRefs.current.forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="p-help">
      <button className="p-help__back" onClick={() => navigate(-1)}>
        ← BACK
      </button>

      <header className="p-help__header">
        <div className="p-help__header-text">
          <div className="p-help__header-label">PROSPECTOR'S GUIDE</div>
          <h1 className="p-help__header-title">HOW TO PLAY</h1>
          <p className="p-help__header-tagline">
            Place your prospects. Read the odds. Climb the ranks.
          </p>
        </div>
        <img
          className="p-help__mascot"
          src="/assets/images/prospector-cropped.png"
          alt="Prospector mascot"
        />
      </header>

      <div className="p-help__steps">
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            className="p-help__step"
            ref={(el) => (stepRefs.current[i] = el)}
            style={{ '--step-delay': `${i * 60}ms` }}
          >
            <div className="p-help__step-meta">
              <span className="p-help__step-num">{step.num}</span>
              <h2 className="p-help__step-title">{step.title}</h2>
              <p className="p-help__step-body">{step.body}</p>
            </div>
            <div className="p-help__step-img-wrap">
              <img
                className="p-help__step-img"
                src={step.img}
                alt={step.alt}
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-help__cta">
        <div className="p-help__cta-label">READY TO COMPETE?</div>
        <button className="p-help__cta-btn" onClick={() => navigate('/p/login')}>
          START PROSPECTING →
        </button>
      </div>
    </div>
  )
}
