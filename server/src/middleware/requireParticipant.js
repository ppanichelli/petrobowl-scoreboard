module.exports = function requireParticipant(req, res, next) {
  if (req.session && req.session.isParticipant) return next()
  res.status(401).json({ error: 'Unauthorized' })
}
