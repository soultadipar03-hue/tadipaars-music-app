const { pool } = require('../db');

async function requireAuth(req, res, next) {
  const accessCode = req.headers['x-access-code'];
  if (!accessCode) return res.status(401).json({ error: 'No access code provided' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE access_code = $1', [accessCode]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid access code' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { requireAuth };
