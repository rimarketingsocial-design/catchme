const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const stripe = require('../lib/stripe');
const { requireAuth } = require('../middleware/auth');

// GET /api/checkins/me — current user's active checkin
router.get('/me', requireAuth, async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('checkins')
    .select('*, clubs(*)')
    .eq('user_id', req.userId)
    .eq('active', true)
    .gt('expires_at', now)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/checkins — check in (free for everyone)
router.post('/', requireAuth, async (req, res) => {
  const { club_id } = req.body;

  if (!club_id) return res.status(400).json({ error: 'club_id is required' });

  // Deactivate previous checkins
  await supabase
    .from('checkins')
    .update({ active: false })
    .eq('user_id', req.userId)
    .eq('active', true);

  // Create new checkin (8 hours)
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id: req.userId,
      club_id,
      expires_at: expiresAt,
      active: true,
    })
    .select('*, clubs(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/checkins/club/:club_id — all going/in_club users for a club
router.get('/club/:club_id', requireAuth, async (req, res) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('checkins')
    .select('id, status, user_id, users!inner(id, name, photo_url)')
    .eq('club_id', req.params.club_id)
    .eq('active', true)
    .gt('expires_at', now);

  if (error) return res.status(500).json({ error: error.message });

  const result = (data || []).map(c => ({
    checkin_id: c.id,
    user_id: c.user_id,
    name: c.users.name,
    photo_url: c.users.photo_url,
    status: c.status || 'going',
  }));

  res.json(result);
});

// PATCH /api/checkins/me/status — update to 'in_club'
router.patch('/me/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!['going', 'in_club'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { data, error } = await supabase
    .from('checkins')
    .update({ status })
    .eq('user_id', req.userId)
    .eq('active', true)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/checkins/me — check out
router.delete('/me', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('checkins')
    .update({ active: false })
    .eq('user_id', req.userId)
    .eq('active', true);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
