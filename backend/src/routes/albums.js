const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

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

module.exports = router;
