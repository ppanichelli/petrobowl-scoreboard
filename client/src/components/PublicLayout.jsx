import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './PublicLayout.css'

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <nav className="public-nav">
        <img src="/assets/images/PETROBOWL 2026 LOGO.png" alt="PetroBowl 2026" className="public-nav__logo" />
        <div className="public-nav__links">
          <NavLink to="/" end>LIVE</NavLink>
          <NavLink to="/next">Next Match</NavLink>
          <NavLink to="/matches">All Matches</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
        </div>
      </nav>
      <div className="public-layout__content">
        <Outlet />
      </div>
    </div>
  )
}
