const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/auth/profile — fetch own profile
router.get('/profile', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, intentions(*)')
    .eq('id', req.userId)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

// POST /api/auth/profile — create/update profile after signup
router.post('/profile', requireAuth, async (req, res) => {
  const { name, gender, photo_url, language, city } = req.body;

  if (!name || !gender) {
    return res.status(400).json({ error: 'name and gender are required' });
  }

  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: req.userId,
      name,
      gender,
      photo_url: photo_url || null,
      language: language || 'en',
      city: city || 'Belgrade',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/auth/profile — partial update
router.patch('/profile', requireAuth, async (req, res) => {
  const allowed = ['name', 'photo_url', 'language', 'city', 'bio'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
