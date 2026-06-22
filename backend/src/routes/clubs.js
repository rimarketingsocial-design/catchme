const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/clubs?city=Belgrade
router.get('/', requireAuth, async (req, res) => {
  const city = req.query.city || 'Belgrade';

  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('city', city)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/clubs/counts?city=Belgrade — opposite gender counts per club
router.get('/counts', requireAuth, async (req, res) => {
  const city = req.query.city || 'Belgrade';
  const now = new Date().toISOString();

  const { data: me } = await supabase
    .from('users').select('gender').eq('id', req.userId).single();

  if (!me) return res.status(404).json({ error: 'User not found' });

  const oppositeGender = me.gender === 'male' ? 'female' : 'male';

  const { data, error } = await supabase
    .from('checkins')
    .select('club_id, users!inner(gender), clubs!inner(city)')
    .eq('active', true)
    .gt('expires_at', now)
    .eq('users.gender', oppositeGender)
    .eq('clubs.city', city);

  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  (data || []).forEach(c => {
    counts[c.club_id] = (counts[c.club_id] || 0) + 1;
  });

  res.json(counts);
});

// GET /api/clubs/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Club not found' });
  res.json(data);
});

// GET /api/clubs/:id/members — people currently checked in (opposite gender)
router.get('/:id/members', requireAuth, async (req, res) => {
  const now = new Date().toISOString();

  // Get requesting user's gender
  const { data: me } = await supabase
    .from('users')
    .select('gender')
    .eq('id', req.userId)
    .single();

  if (!me) return res.status(404).json({ error: 'User not found' });

  const oppositeGender = me.gender === 'male' ? 'female' : 'male';

  // Get active checkins for this club, join users + intentions
  const { data, error } = await supabase
    .from('checkins')
    .select(`
      id,
      checked_in_at,
      user_id,
      users!inner(id, name, photo_url, gender),
      clubs!inner(id)
    `)
    .eq('club_id', req.params.id)
    .eq('active', true)
    .gt('expires_at', now)
    .eq('users.gender', oppositeGender)
    .neq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });

  // Enrich with intentions
  const userIds = data.map(c => c.user_id);
  let intentionsMap = {};
  if (userIds.length > 0) {
    const { data: intentions } = await supabase
      .from('intentions')
      .select('user_id, type')
      .in('user_id', userIds);
    if (intentions) {
      intentions.forEach(i => { intentionsMap[i.user_id] = i.type; });
    }
  }

  const members = data.map(c => ({
    checkin_id: c.id,
    user_id: c.user_id,
    name: c.users.name,
    photo_url: c.users.photo_url,
    intention: intentionsMap[c.user_id] || null,
    checked_in_at: c.checked_in_at,
  }));

  res.json(members);
});

module.exports = router;
