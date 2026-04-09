import React, { useEffect, useState } from 'react'
import { useSocket } from '../hooks/useSocket'
import './PublicLeaderboard.css'

export default function PublicLeaderboard() {
  const [rows, setRows] = useState([])
  const socket = useSocket()

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(setRows)
  }, [])

  useEffect(() => {
    if (!socket) return
    const onUpdate = () => fetch('/api/leaderboard').then(r => r.json()).then(setRows)
    socket.on('leaderboard', onUpdate)
    return () => socket.off('leaderboard', onUpdate)
  }, [socket])

  return (
    <div className="pub-lb">
      <h2 className="pub-lb__heading">Leaderboard</h2>
      {rows.length === 0
        ? <p className="pub-lb__empty">No participants on the board yet.</p>
        : (
          <table className="pub-lb__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Country</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.pin}>
                  <td className="pub-lb__rank">{r.rank}</td>
                  <td>{r.display_name || '—'}</td>
                  <td>
                    {r.country_code && <span className={`fi fi-${r.country_code.toLowerCase()}`} />}
                  </td>
                  <td className="pub-lb__pts">{Number(r.total_points).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  )
}
