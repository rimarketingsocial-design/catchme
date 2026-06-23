const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/vibe?club_id=X&city=Belgrade — active stories sorted by coin count
router.get('/', requireAuth, async (req, res) => {
  const { club_id, city } = req.query;
  const now = new Date().toISOString();

  // Step 1: get club_ids for city filter
  let clubIds = null;
  if (city && !club_id) {
    const { data: cityClubs } = await supabase
      .from('clubs')
      .select('id')
      .eq('city', city);
    clubIds = (cityClubs || []).map(c => c.id);
    if (clubIds.length === 0) return res.json([]);
  }

  // Step 2: fetch stories (no join — user_id refs auth.users, not public.users)
  let query = supabase
    .from('vibe_stories')
    .select('*')
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (club_id) query = query.eq('club_id', club_id);
  else if (clubIds) query = query.in('club_id', clubIds);

  const { data: stories, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  if (!stories?.length) return res.json([]);

  // Step 3: fetch user profiles from public.users
  const userIds = [...new Set(stories.map(s => s.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, name, photo_url')
    .in('id', userIds);
  const userMap = {};
  (users || []).forEach(u => { userMap[u.id] = u; });

  // Step 4: count coins per story
  const storyIds = stories.map(s => s.id);
  const { data: coins } = await supabase
    .from('catch_coins')
    .select('story_id')
    .in('story_id', storyIds);

  const coinMap = {};
  (coins || []).forEach(c => {
    coinMap[c.story_id] = (coinMap[c.story_id] || 0) + 1;
  });

  const result = stories.map(s => ({
    ...s,
    user: userMap[s.user_id] || null,
    coin_count: coinMap[s.id] || 0,
  })).sort((a, b) => b.coin_count - a.coin_count);

  res.json(result);
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

  await supabase.rpc('increment_coins', { uid: story.user_id });

  res.json({ success: true });
});

module.exports = router;
