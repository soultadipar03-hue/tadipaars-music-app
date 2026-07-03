const express = require('express');
const { drive } = require('@googleapis/drive');
const { OAuth2Client } = require('google-auth-library');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const stream = require('stream');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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

// POST /api/songs/:albumId/upload — upload an MP3 to Google Drive, store metadata in Supabase
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

    const drive = await getAuthenticatedDrive(req.user);
    const metadata = await drive.files.get({
      fileId: song.drive_file_id,
      fields: 'name,mimeType,size',
    });

    const range = req.headers.range;
    const driveResponse = await drive.files.get(
      { fileId: song.drive_file_id, alt: 'media' },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    const headers = driveResponse.headers || {};
    const contentType = metadata.data.mimeType || headers['content-type'] || 'audio/mpeg';

    res.status(driveResponse.status || (range ? 206 : 200));
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    if (headers['content-length']) res.setHeader('Content-Length', headers['content-length']);
    else if (metadata.data.size && !range) res.setHeader('Content-Length', metadata.data.size);
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

router.post('/:albumId/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const drive = await getAuthenticatedDrive(req.user);
    const folderId = await getOrCreateFolder(drive);

    const title = req.body.title || req.file.originalname.replace(/\.mp3$/i, '');
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
    console.error('Upload error:', err);
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
