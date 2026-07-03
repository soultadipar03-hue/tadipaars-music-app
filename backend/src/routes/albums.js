const express = require('express');
const { drive } = require('@googleapis/drive');
const { OAuth2Client } = require('google-auth-library');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const stream = require('stream');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Build authenticated Drive client (same pattern as songs.js)
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

// Find or create the "Tadipaar's Music" folder in Drive
async function getOrCreateFolder(driveClient) {
  const res = await driveClient.files.list({
    q: "name='Tadipaar\\'s Music' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const folder = await driveClient.files.create({
    requestBody: { name: "Tadipaar's Music", mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.data.id;
}

// GET /api/albums — list all albums for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/albums — create a new album
router.post('/', async (req, res) => {
  const { name, cover_image_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Album name required' });

  try {
    const { data, error } = await supabase
      .from('albums')
      .insert({ user_id: req.user.id, name, cover_image_url: cover_image_url || null })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/albums/:id — delete an album (and its songs cascade in DB)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/albums/:id/cover — upload cover image to Drive, save public URL
router.post('/:id/cover', upload.single('cover'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  // Accept common image types only
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed' });
  }

  try {
    // Verify album belongs to user
    const { data: album, error: fetchErr } = await supabase
      .from('albums')
      .select('id, cover_drive_file_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !album) return res.status(404).json({ error: 'Album not found' });

    const driveClient = await getAuthenticatedDrive(req.user);
    const folderId = await getOrCreateFolder(driveClient);

    // Delete old cover from Drive if it exists
    if (album.cover_drive_file_id) {
      try {
        await driveClient.files.delete({ fileId: album.cover_drive_file_id });
      } catch (e) {
        console.warn('Old cover delete failed:', e.message);
      }
    }

    // Upload new cover to Drive
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const uploaded = await driveClient.files.create({
      requestBody: {
        name: `cover_${req.params.id}.${ext}`,
        parents: [folderId],
      },
      media: { mimeType: req.file.mimetype, body: bufferStream },
      fields: 'id',
    });

    const coverFileId = uploaded.data.id;

    // Make it publicly readable
    await driveClient.permissions.create({
      fileId: coverFileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Direct thumbnail URL that works in <img> tags
    const coverUrl = `https://drive.google.com/thumbnail?id=${coverFileId}&sz=w400`;

    // Save to Supabase
    const { data: updated, error: updateErr } = await supabase
      .from('albums')
      .update({ cover_image_url: coverUrl, cover_drive_file_id: coverFileId })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);
    res.json(updated);
  } catch (err) {
    console.error('Cover upload error:', err);
    res.status(500).json({ error: 'Cover upload failed: ' + err.message });
  }
});

module.exports = router;
