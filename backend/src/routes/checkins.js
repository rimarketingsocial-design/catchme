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
