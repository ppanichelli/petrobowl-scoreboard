import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import PublicLayout      from './components/PublicLayout'
import Scoreboard        from './views/Scoreboard'
import NextMatch         from './views/NextMatch'
import AllMatches        from './views/AllMatches'
import PublicLeaderboard from './views/PublicLeaderboard'
import Landing           from './views/Landing'
import ProspectsView     from './views/ProspectsView'
import Tables            from './views/Tables'
import Draw              from './views/Draw'
import DrawAdmin         from './views/DrawAdmin'
import Bracket          from './views/Bracket'
import MatchDetail      from './views/MatchDetail'
import BracketAdmin     from './views/BracketAdmin'
import AdminLogin        from './views/AdminLogin'
import AdminConsole      from './views/AdminConsole'
import ParticipantLogin  from './views/ParticipantLogin'
import ParticipantApp    from './views/ParticipantApp'
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
          {/* Public / LED screens — all wrapped in PublicLayout for shared nav */}
          <Route element={<PublicLayout />}>
            <Route path="/"            element={<Scoreboard />} />
            <Route path="/next"        element={<NextMatch />} />
            <Route path="/matches"     element={<AllMatches />} />
            <Route path="/leaderboard" element={<PublicLeaderboard />} />
            <Route path="/landing"     element={<Landing />} />
            <Route path="/prospects"   element={<ProspectsView />} />
            <Route path="/tables"      element={<Tables />} />
            <Route path="/draw"        element={<Draw />} />
            <Route path="/bracket"     element={<Bracket />} />
            <Route path="/match/:id"   element={<MatchDetail />} />
          </Route>

          {/* Admin (timekeeper) */}
          <Route path="/timekeeper/login" element={<AdminLogin />} />
          <Route path="/timekeeper/draw" element={
            <AdminRoute><DrawAdmin /></AdminRoute>
          } />
          <Route path="/timekeeper/bracket" element={
            <AdminRoute><BracketAdmin /></AdminRoute>
          } />
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
