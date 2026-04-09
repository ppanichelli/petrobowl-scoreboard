import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Scoreboard      from './views/Scoreboard'
import NextMatch       from './views/NextMatch'
import AdminLogin      from './views/AdminLogin'
import AdminConsole    from './views/AdminConsole'
import ParticipantLogin from './views/ParticipantLogin'
import ParticipantApp  from './views/ParticipantApp'
import ProspectsView   from './views/ProspectsView'
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth'
import { ParticipantAuthProvider, useParticipantAuth } from './hooks/useParticipantAuth'

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAdminAuth()
  if (loading) return null
  return isAdmin ? children : <Navigate to="/timekeeper/login" replace />
}

function ParticipantRoute({ children }) {
  const { isParticipant, loading } = useParticipantAuth()
  if (loading) return null
  return isParticipant ? children : <Navigate to="/p/login" replace />
}

export default function App() {
  return (
    <AdminAuthProvider>
      <ParticipantAuthProvider>
        <Routes>
          {/* Public / LED screens */}
          <Route path="/"          element={<Scoreboard />} />
          <Route path="/next"      element={<NextMatch />} />
          <Route path="/prospects" element={<ProspectsView />} />

          {/* Admin (timekeeper) */}
          <Route path="/timekeeper/login" element={<AdminLogin />} />
          <Route path="/timekeeper/*" element={
            <AdminRoute><AdminConsole /></AdminRoute>
          } />

          {/* Participant */}
          <Route path="/p/login" element={<ParticipantLogin />} />
          <Route path="/p/*" element={
            <ParticipantRoute><ParticipantApp /></ParticipantRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ParticipantAuthProvider>
    </AdminAuthProvider>
  )
}
