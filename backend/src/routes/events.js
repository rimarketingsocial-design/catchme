const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

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
  const { name, date, start_time } = req.body;
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
    .insert({ club_id: owner.club_id, name, date, start_time })
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
