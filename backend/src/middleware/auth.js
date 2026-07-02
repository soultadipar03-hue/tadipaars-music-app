const { supabase } = require('../db');

async function requireAuth(req, res, next) {
  const accessCode = req.headers['x-access-code'];
  if (!accessCode) return res.status(401).json({ error: 'No access code provided' });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('access_code', accessCode)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid access code' });

  req.user = data;
  next();
}

module.exports = { requireAuth };
