const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const JWT_SECRET="sdflkdfkldsjfkldsj"
const verifyToken = async (req, res, next) => {
  // ── Sanity-check server config first ─────────────────────────
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set in server/.env — all token verifications will fail!');
    return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET missing.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user)           return res.status(401).json({ error: 'User not found.' });
    if (!user.isActive)  return res.status(403).json({ error: 'Account is disabled.' });
    req.user = user;
    next();
  } catch (err) {
    // Give a helpful error message in the response
    const msg = err.name === 'TokenExpiredError'
      ? 'Token has expired. Please log in again.'
      : err.name === 'JsonWebTokenError'
      ? 'Invalid token.'
      : 'Token verification failed.';
    console.warn('[verifyToken]', err.name, '—', err.message);
    return res.status(401).json({ error: msg });
  }
};

module.exports = verifyToken;