const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/events/today?city=Belgrade — events visible now (12h before start until end)
router.get('/today', async (req, res) => {
  const city = req.query.city || 'Belgrade';
  const now = new Date();

  // Fetch today's and yesterday's events to catch cross-midnight parties
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now - 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('events')
    .select('*, clubs!inner(city)')
    .in('date', [today, yesterday])
    .eq('clubs.city', city);

  if (error) return res.status(500).json({ error: error.message });

  const map = {};
  (data || []).forEach(e => {
    if (!e.end_time) {
      // No end_time — fall back to old date-match behaviour
      if (e.date === today) map[e.club_id] = e;
      return;
    }

    const [sh, sm] = e.start_time.split(':').map(Number);
    const [eh, em] = e.end_time.split(':').map(Number);

    const startDate = new Date(`${e.date}T${e.start_time}`);
    let endDate = new Date(`${e.date}T${e.end_time}`);
    // If end is before start (cross-midnight), push end to next day
    if (eh < sh || (eh === sh && em < sm)) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const visibleFrom = new Date(startDate.getTime() - 12 * 60 * 60 * 1000);

    if (now >= visibleFrom && now <= endDate) {
      map[e.club_id] = e;
    }
  });

  res.json(map);
});

// GET /api/events?club_id=X
router.get('/', async (req, res) => {
  const { club_id } = req.query;
  if (!club_id) return res.status(400).json({ error: 'club_id is required' });

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', club_id)
    .order('date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/events
router.post('/', requireAuth, async (req, res) => {
  const { name, date, start_time, end_time } = req.body;
  if (!name || !date || !start_time) {
    return res.status(400).json({ error: 'name, date i start_time su obavezni' });
  }

  // Verify requester owns a club
  const { data: owner } = await supabase
    .from('club_owners')
    .select('club_id')
    .eq('auth_user_id', req.userId)
    .single();
  if (!owner) return res.status(403).json({ error: 'Nemate pristup' });

  const { data, error } = await supabase
    .from('events')
    .insert({ club_id: owner.club_id, name, date, start_time, end_time: end_time || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/events/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: owner } = await supabase
    .from('club_owners')
    .select('club_id')
    .eq('auth_user_id', req.userId)
    .single();
  if (!owner) return res.status(403).json({ error: 'Nemate pristup' });

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', req.params.id)
    .eq('club_id', owner.club_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
