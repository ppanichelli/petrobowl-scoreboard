/**
 * Parimutuel odds calculation.
 * Returns { oddsA, oddsB } rounded to one decimal place.
 * Minimum odds are 1.0 (stake returned).
 */
function calcOdds(prospectsA, prospectsB) {
  const total = prospectsA + prospectsB

  if (total === 0) return { oddsA: 2.0, oddsB: 2.0 }

  const round1 = v => Math.round(v * 10) / 10
  const rawA = prospectsA === 0 ? 10 : round1(total / prospectsA)
  const rawB = prospectsB === 0 ? 10 : round1(total / prospectsB)

  return {
    oddsA: Math.max(1.0, rawA),
    oddsB: Math.max(1.0, rawB),
  }
}

module.exports = { calcOdds }
