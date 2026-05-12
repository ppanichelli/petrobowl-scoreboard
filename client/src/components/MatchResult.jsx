import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './MatchResult.css'

const GOLD_PALETTE  = ['#F2A900', '#FFB800', '#FFC93C', '#E8960A', '#FFCA28']
const BLUE_PALETTE  = ['#0072CE', '#1E8FE1', '#005FAB', '#4DB6FF']
const WHITE_HOT     = 'rgba(255,255,255,0.92)'

function spawnParticle(cx, cy) {
  const angle    = Math.random() * Math.PI * 2
  const speed    = 2.5 + Math.random() * 7
  const roll     = Math.random()
  let color, radius
  if (roll < 0.65) {
    color  = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)]
    radius = 1.5 + Math.random() * 3
  } else if (roll < 0.90) {
    color  = BLUE_PALETTE[Math.floor(Math.random() * BLUE_PALETTE.length)]
    radius = 1.5 + Math.random() * 3
  } else {
    color  = WHITE_HOT
    radius = 0.8 + Math.random() * 1.2
  }
  return {
    x: cx, y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 2.0,
    life: 1.0,
    decay: 0.008 + Math.random() * 0.010,
    radius,
    color,
    twinkle:       Math.random() < 0.30,
    twinkleSpeed:  0.08 + Math.random() * 0.10,
    twinklePhase:  Math.random() * Math.PI * 2,
    trail:         Math.random() < 0.20,
    isGold:        roll < 0.65,
  }
}

function useParticles(canvasRef, active) {
  useEffect(() => {
    if (!active) return
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const cx = canvas.width / 2
    const cy = canvas.height * 0.50

    const particles = Array.from({ length: 180 }, () => spawnParticle(cx, cy))
    let rafId
    let frame = 0

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true

        p.vx *= 0.965
        p.vy  = p.vy * 0.965 + 0.055
        p.x  += p.vx
        p.y  += p.vy
        p.life -= p.decay

        const baseAlpha = Math.max(0, p.life)
        const alpha = p.twinkle
          ? baseAlpha * (0.5 + 0.5 * Math.sin(frame * p.twinkleSpeed + p.twinklePhase))
          : baseAlpha

        const r = p.radius * Math.pow(p.life, 0.4)

        if (p.trail) {
          ctx.beginPath()
          ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3)
          ctx.lineTo(p.x, p.y)
          ctx.strokeStyle = hexToRgba(p.color, alpha * 0.35)
          ctx.lineWidth   = r * 0.6
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(p.color, alpha)
        ctx.fill()

        if (p.isGold && p.radius > 3) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(0.1, r * 2.5), 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(p.color, alpha * 0.12)
          ctx.fill()
        }
      }

      if (alive) {
        rafId = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active, canvasRef])
}

function hexToRgba(color, alpha) {
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${alpha.toFixed(3)})`)
  }
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}

function formatStage(s) {
  const map = {
    group:         'Group Stage',
    quarterfinal:  'Quarterfinal',
    semifinal:     'Semifinal',
    third_place:   'Third Place',
    final:         'Grand Final',
    tiebreaker:    'Tiebreaker',
    loser_bracket: 'Loser Bracket',
  }
  return map[s] || s
}

export default function MatchResult({ match, onClose }) {
  const isDraw   = !!match.is_draw
  const winner   = isDraw ? null
    : (match.winner_id === match.team_a_id ? match.team_a_short : match.team_b_short)
  const navigate = useNavigate()
  const canvasRef = useRef(null)

  useParticles(canvasRef, !isDraw)

  const nameLen   = winner ? winner.length : 0
  const winsDelay = 480 + nameLen * 55 + 20
  const scoresDelay = winsDelay + 20
  const btnsDelay   = scoresDelay + 180

  const isWinnerA = !isDraw && match.winner_id === match.team_a_id

  if (isDraw) {
    return (
      <div className="match-result">
        <div className="match-result__overlay match-result__overlay--draw">
          <div className="match-result__card match-result__card--draw">
            <div className="match-result__stage-badge match-result__stage-badge--draw">
              {formatStage(match.stage)}
            </div>
            <div className="match-result__champion-line match-result__champion-line--draw"
                 style={{ animationDelay: '280ms' }} />
            <span className="match-result__draw-text">DRAW</span>
            <span className="match-result__draw-subtext"
                  style={{ animationDelay: '350ms' }}>
              Match ended in a draw
            </span>
            <div className="match-result__scores" style={{ animationDelay: '480ms' }}>
              <div className="match-result__score-col">
                <div className="match-result__score-value">
                  {String(match.score_a).padStart(2, '0')}
                </div>
                <div className="match-result__score-team">{match.team_a_short}</div>
              </div>
              <div className="match-result__score-sep">—</div>
              <div className="match-result__score-col">
                <div className="match-result__score-value">
                  {String(match.score_b).padStart(2, '0')}
                </div>
                <div className="match-result__score-team">{match.team_b_short}</div>
              </div>
            </div>
            <div className="match-result__actions" style={{ animationDelay: '640ms' }}>
              <button className="match-result__next-btn" onClick={() => navigate('/next')}>
                Next Match →
              </button>
              <button className="match-result__close-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="match-result">
      <canvas ref={canvasRef} className="match-result__canvas" />
      <div className="match-result__overlay">
        <div className="match-result__card">
          <div className="match-result__stage-badge">{formatStage(match.stage)}</div>
          <div className="match-result__champion-line" style={{ animationDelay: '380ms' }} />
          <div className="match-result__winner-name">
            {winner.split('').map((ch, i) => (
              <span
                key={i}
                className="match-result__letter"
                style={{ animationDelay: `${480 + i * 55}ms` }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span
            className="match-result__wins-label"
            style={{ animationDelay: `${winsDelay}ms` }}
          >
            WINS!
          </span>
          <div
            className="match-result__scores"
            style={{ animationDelay: `${scoresDelay}ms` }}
          >
            <div className="match-result__score-col">
              <div className={`match-result__score-value${isWinnerA ? ' match-result__score-value--winner' : ''}`}>
                {String(match.score_a).padStart(2, '0')}
              </div>
              <div className="match-result__score-team">{match.team_a_short}</div>
            </div>
            <div className="match-result__score-sep">—</div>
            <div className="match-result__score-col">
              <div className={`match-result__score-value${!isWinnerA ? ' match-result__score-value--winner' : ''}`}>
                {String(match.score_b).padStart(2, '0')}
              </div>
              <div className="match-result__score-team">{match.team_b_short}</div>
            </div>
          </div>
          <div
            className="match-result__actions"
            style={{ animationDelay: `${btnsDelay}ms` }}
          >
            <button className="match-result__next-btn" onClick={() => navigate('/next')}>
              Next Match →
            </button>
            <button className="match-result__close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
