import React, { useEffect, useState } from 'react'
import NextMatchBanner from '../components/NextMatchBanner'

export default function NextMatch() {
  const [match, setMatch] = useState(null)

  useEffect(() => {
    fetch('/api/matches/next').then(r => r.json()).then(setMatch)
  }, [])

  if (!match) return <div style={{ color: '#fff', textAlign: 'center', padding: '4rem' }}>No upcoming match.</div>
  return <NextMatchBanner match={match} />
}
