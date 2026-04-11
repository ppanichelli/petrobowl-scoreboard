import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import './NavMenu.css'

const NAV_ITEMS = [
  { to: '/',            label: 'Scoreboard',  icon: '◈' },
  { to: '/next',        label: 'Next Match',  icon: '◎' },
  { to: '/matches',     label: 'Matches',     icon: '▤' },
  { to: '/leaderboard', label: 'Leaderboard', icon: '◇' },
  { to: '/landing',     label: 'Landing',     icon: '◻' },
]

export default function NavMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  // Close on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const menu = (
    <div className="nav-menu" ref={ref}>
      <div className={`nav-menu__drawer${open ? ' nav-menu__drawer--open' : ''}`}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `nav-menu__item${isActive ? ' nav-menu__item--active' : ''}`
            }
          >
            <span className="nav-menu__icon">{item.icon}</span>
            <span className="nav-menu__label">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <button
        className={`nav-menu__btn${open ? ' nav-menu__btn--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Navigation menu"
      >
        <span className="nav-menu__btn-bar" />
        <span className="nav-menu__btn-bar" />
        <span className="nav-menu__btn-bar" />
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}
