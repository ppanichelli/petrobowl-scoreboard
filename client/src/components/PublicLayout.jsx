import React from 'react'
import { Outlet } from 'react-router-dom'
import NavMenu from './NavMenu'
import './PublicLayout.css'

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <div className="public-layout__content">
        <Outlet />
      </div>
      <NavMenu />
    </div>
  )
}
