const express = require('express');
const { google } = require('googleapis');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const stream = require('stream');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function getAuthenticatedDrive(user) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token,
  });
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await pool.query('UPDATE users SET google_access_token = $1 WHERE id = $2', [tokens.access_token, user.id]);
    }
  });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

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

router.get('/:albumId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM songs WHERE album_id = $1 AND user_id = $2 ORDER BY created_at ASC',
      [req.params.albumId, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:albumId/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  try {
    const drive = await getAuthenticatedDrive(req.user);
    const folderId = await getOrCreateFolder(drive);

    const title = req.body.title || req.file.originalname.replace('.mp3', '');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const uploaded = await drive.files.create({
      requestBody: { name: req.file.originalname, parents: [folderId] },
      media: { mimeType: 'audio/mpeg', body: bufferStream },
      fields: 'id',
    });

    const driveFileId = uploaded.data.id;
    await drive.permissions.create({
      fileId: driveFileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const result = await pool.query(
      'INSERT INTO songs (album_id, user_id, title, drive_file_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.albumId, req.user.id, title, driveFileId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

router.delete('/:songId', async (req, res) => {
  try {
    const song = await pool.query('SELECT * FROM songs WHERE id = $1 AND user_id = $2', [req.params.songId, req.user.id]);
    if (song.rows.length === 0) return res.status(404).json({ error: 'Song not found' });

    try {
      const drive = await getAuthenticatedDrive(req.user);
      await drive.files.delete({ fileId: song.rows[0].drive_file_id });
    } catch (e) { console.warn('Drive delete failed:', e.message); }

    await pool.query('DELETE FROM songs WHERE id = $1', [req.params.songId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
