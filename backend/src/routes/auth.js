const express = require('express');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

const router = express.Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i === 4) { code += '-'; continue; }
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const accessCode = generateAccessCode();
    await pool.query(
      'INSERT INTO users (google_access_token, google_refresh_token, access_code) VALUES ($1, $2, $3)',
      [tokens.access_token, tokens.refresh_token, accessCode]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    res.redirect(`${frontendUrl}/auth/success?code=${accessCode}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Authentication failed');
  }
});

router.post('/verify', async (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ error: 'Access code required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE access_code = $1', [accessCode]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid access code' });
    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
