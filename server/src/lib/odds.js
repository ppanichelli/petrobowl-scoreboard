/**
 * Parimutuel odds calculation (×10 display scale).
 * Returns { oddsA, oddsB } as integers (scaled by 10).
 */
function calcOdds(prospectsA, prospectsB) {
  const total = prospectsA + prospectsB

  // Edge: no prospects at all → display 10/10 (even)
  if (total === 0) return { oddsA: 10, oddsB: 10 }

  // Edge: all on one side → that side gets 10, other gets 10 (no division by zero)
  const rawA = prospectsA === 0 ? 10 : Math.round((total / prospectsA) * 10)
  const rawB = prospectsB === 0 ? 10 : Math.round((total / prospectsB) * 10)

  // Minimum payout is always 10 (stake returned)
  return {
    oddsA: Math.max(10, rawA),
    oddsB: Math.max(10, rawB),
  }
}

module.exports = { calcOdds }
