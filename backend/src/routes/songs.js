const express = require('express');
const { drive } = require('@googleapis/drive');
const { OAuth2Client } = require('google-auth-library');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const stream = require('stream');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 90 * 1024 * 1024 } });

// Build an authenticated Google Drive client for a user, with auto token refresh
async function getAuthenticatedDrive(user) {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });

  // Persist refreshed tokens automatically so future requests never 403
  // Google can rotate both access_token and refresh_token — save both when present
  oauth2Client.on('tokens', async (tokens) => {
    const updates = {};
    if (tokens.access_token) updates.google_access_token = tokens.access_token;
    if (tokens.refresh_token) updates.google_refresh_token = tokens.refresh_token;
    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', user.id);
    }
  });

  // If no refresh token, throw a clear error so the frontend can prompt re-auth
  if (!user.google_refresh_token) {
    throw Object.assign(new Error('Google token expired. Please reconnect Google Drive.'), { code: 'REAUTH_REQUIRED' });
  }

  return drive({ version: 'v3', auth: oauth2Client });
}

// Find or create the "Tadipaar's Music" folder in the user's Drive
async function getOrCreateFolder(drive) {
  const res = await drive.files.list({
    q: "name='Tadipaar\\'s Music' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
  });
  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: { name: "Tadipaar's Music", mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.data.id;
}

// GET /api/songs/:songId/stream — proxy audio from Google Drive with range request support
// NOTE: must be registered BEFORE /:albumId so Express doesn't swallow the /stream segment
router.get('/:songId/stream', async (req, res) => {
  try {
    const { data: song, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', req.params.songId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !song) return res.status(404).json({ error: 'Song not found' });
    if (!song.drive_file_id) return res.status(404).json({ error: 'Song file not found' });

    const driveClient = await getAuthenticatedDrive(req.user);

    const range = req.headers.range;
    const driveResponse = await driveClient.files.get(
      { fileId: song.drive_file_id, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    const headers = driveResponse.headers || {};
    const contentType = headers['content-type'] || 'audio/mpeg';
    const status = driveResponse.status || (range ? 206 : 200);

    res.status(status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
    if (headers['content-range']) res.setHeader('Content-Range', headers['content-range']);

    driveResponse.data.on('error', (err) => {
      console.error('Drive stream error:', err);
      if (!res.headersSent) res.status(500).end('Stream failed');
      else res.destroy(err);
    });
    driveResponse.data.pipe(res);
  } catch (err) {
    console.error('Stream error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Stream failed: ' + err.message });
  }
});

// GET /api/songs/:albumId — list all songs in an album
router.get('/:albumId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('album_id', req.params.albumId)
      .eq('user_id', req.user.id)
      .order('uploaded_at', { ascending: true });

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:albumId/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  // Validate MIME type — only allow audio files
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/flac'];
  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only audio files are allowed (MP3, M4A, OGG, WAV, FLAC)' });
  }

  try {
    const drive = await getAuthenticatedDrive(req.user);
    const folderId = await getOrCreateFolder(drive);

    // Sanitize title — strip control chars, limit length
    const rawTitle = req.body.title || req.file.originalname.replace(/\.mp3$/i, '');
    const title = rawTitle.replace(/[<>"'&\x00-\x1f]/g, '').trim().slice(0, 200) || 'Untitled';
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    // Upload to Drive
    const uploaded = await drive.files.create({
      requestBody: { name: req.file.originalname, parents: [folderId] },
      media: { mimeType: 'audio/mpeg', body: bufferStream },
      fields: 'id,webContentLink',
    });

    const driveFileId = uploaded.data.id;
    const driveLink = uploaded.data.webContentLink || `https://drive.google.com/uc?export=download&id=${driveFileId}`;

    // Make file publicly readable so it can be streamed
    await drive.permissions.create({
      fileId: driveFileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Store metadata only — audio file lives in Drive
    const { data, error } = await supabase
      .from('songs')
      .insert({
        album_id: req.params.albumId,
        user_id: req.user.id,
        title,
        drive_file_id: driveFileId,
        drive_link: driveLink,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    console.error('Upload error:', err.name);
    if (err.code === 'REAUTH_REQUIRED') {
      return res.status(401).json({ error: 'Google Drive session expired. Please reconnect Google Drive from the login page.' });
    }
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// DELETE /api/songs/:songId — delete from Drive + Supabase
router.delete('/:songId', async (req, res) => {
  try {
    const { data: song, error: fetchErr } = await supabase
      .from('songs')
      .select('*')
      .eq('id', req.params.songId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !song) return res.status(404).json({ error: 'Song not found' });

    // Best-effort Drive deletion — don't fail the request if Drive errors
    try {
      const drive = await getAuthenticatedDrive(req.user);
      await drive.files.delete({ fileId: song.drive_file_id });
    } catch (e) {
      console.warn('Drive delete failed:', e.message);
    }

    const { error: delErr } = await supabase.from('songs').delete().eq('id', req.params.songId);
    if (delErr) throw new Error(delErr.message);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
