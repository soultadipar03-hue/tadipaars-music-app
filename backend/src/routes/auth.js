const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { supabase } = require('../db');

const router = express.Router();

// Fixed access code — the single password for this app
const FIXED_ACCESS_CODE = process.env.ACCESS_CODE || 'moveon';

function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

function getFrontendUrl() {
  const configuredUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
  const normalizedUrl = configuredUrl
    .trim()
    .replace(/^FRONTEND_URL\s*=\s*/i, '')
    .replace(/\/+$/, '');

  try {
    const url = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Unsupported frontend URL protocol: ${url.protocol}`);
    }
    return url.origin;
  } catch (err) {
    console.warn(`Invalid FRONTEND_URL "${configuredUrl}", falling back to ${DEFAULT_FRONTEND_URL}`);
    return DEFAULT_FRONTEND_URL;
  }
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

    // Check if the fixed-code user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('access_code', FIXED_ACCESS_CODE)
      .single();

    if (existing) {
      // User exists — only update tokens, never touch id or other data
      // This preserves all albums and songs linked to this user
      const updates = { google_access_token: tokens.access_token };
      if (tokens.refresh_token) updates.google_refresh_token = tokens.refresh_token;

      const { error: updateErr } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existing.id);

      if (updateErr) throw new Error(updateErr.message);
    } else {
      // First time ever — create the user row with the fixed code
      const { error: insertErr } = await supabase
        .from('users')
        .insert({
          access_code: FIXED_ACCESS_CODE,
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
        });

      if (insertErr) throw new Error(insertErr.message);
    }

    // Redirect to auth/success so the user sees the access code screen
    const redirectUrl = new URL('/auth/success', getFrontendUrl());
    redirectUrl.searchParams.set('code', FIXED_ACCESS_CODE);
    res.redirect(redirectUrl.toString());
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
