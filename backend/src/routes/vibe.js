const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/vibe?club_id=X — active stories sorted by coin count
router.get('/', requireAuth, async (req, res) => {
  const { club_id } = req.query;
  const now = new Date().toISOString();

  let query = supabase
    .from('vibe_stories')
    .select('*, users!inner(id, name, photo_url, gender), catch_coins(count)')
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (club_id) query = query.eq('club_id', club_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Count coins per story
  const stories = (data || []).map(s => ({
    ...s,
    coin_count: s.catch_coins?.[0]?.count || 0,
    user: s.users,
  })).sort((a, b) => b.coin_count - a.coin_count);

  res.json(stories);
});

// POST /api/vibe — create vibe story
router.post('/', requireAuth, async (req, res) => {
  const { club_id, photo_url, medal } = req.body;
  const MEDALS = ['fire', 'vibe', 'queen', 'party'];

  if (!club_id || !photo_url || !MEDALS.includes(medal)) {
    return res.status(400).json({ error: 'club_id, photo_url i medal su obavezni' });
  }

  // Check user is checked in to this club
  const now = new Date().toISOString();
  const { data: checkin } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', req.userId)
    .eq('club_id', club_id)
    .eq('active', true)
    .gt('expires_at', now)
    .single();

  if (!checkin) return res.status(403).json({ error: 'Morate biti prijavljeni u klub da biste dodali Vibe' });

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('vibe_stories')
    .insert({ user_id: req.userId, club_id, photo_url, medal, expires_at: expiresAt })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/vibe/:id/coin — send catch coin
router.post('/:id/coin', requireAuth, async (req, res) => {
  const { data: story } = await supabase
    .from('vibe_stories')
    .select('user_id')
    .eq('id', req.params.id)
    .single();

  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user_id === req.userId) return res.status(400).json({ error: 'Ne možete poslati coin sebi' });

  const { error } = await supabase
    .from('catch_coins')
    .insert({ sender_id: req.userId, story_id: req.params.id });

  if (error?.code === '23505') return res.status(400).json({ error: 'Već ste poslali coin' });
  if (error) return res.status(500).json({ error: error.message });

  // Increment total coins on story owner
  await supabase.rpc('increment_coins', { uid: story.user_id });

  res.json({ success: true });
});

module.exports = router;
