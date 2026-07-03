const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { supabase } = require('../db');

const router = express.Router();

function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TMUS-${suffix}`;
}

// GET /api/auth/google — returns the Google OAuth URL
router.get('/google', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.json({ url });
});

// GET /api/auth/callback — Google redirects here after OAuth approval
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const accessCode = generateAccessCode();

    const { error } = await supabase.from('users').insert({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      access_code: accessCode,
    });

    if (error) throw new Error(error.message);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/success?code=${accessCode}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Authentication failed');
  }
});

// POST /api/auth/verify — validates an access code
router.post('/verify', async (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ error: 'Access code required' });

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('access_code', accessCode)
      .single();

    if (error || !data) return res.status(401).json({ error: 'Invalid access code' });

    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
