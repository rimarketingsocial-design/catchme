const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const GENRES = ['House', 'Techno', 'Hip-Hop', 'R&B', 'Pop', 'Latino', 'Turbo-Folk', 'Rock', 'EDM', 'Commercial'];

// POST /api/club-auth/register — called after Supabase signUp, with the user's JWT
router.post('/register', requireAuth, async (req, res) => {
  const { club_name, address, genre, city, photo_url } = req.body;
  if (!club_name || !address || !genre || !city) {
    return res.status(400).json({ error: 'Sva polja su obavezna' });
  }

  // Check not already registered
  const { data: existing } = await supabase
    .from('club_owners')
    .select('id')
    .eq('auth_user_id', req.userId)
    .single();
  if (existing) return res.status(400).json({ error: 'Već imate registrovan klub' });

  // Create club record
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name: club_name, address, genre, city, photo_url: photo_url || null })
    .select()
    .single();
  if (clubError) return res.status(500).json({ error: clubError.message });

  // Link owner to club
  const { error: ownerError } = await supabase
    .from('club_owners')
    .insert({ auth_user_id: req.userId, club_id: club.id });
  if (ownerError) return res.status(500).json({ error: ownerError.message });

  res.json({ club });
});

// GET /api/club-auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data: owner, error } = await supabase
    .from('club_owners')
    .select('club_id')
    .eq('auth_user_id', req.userId)
    .single();
  if (error || !owner) return res.status(404).json({ error: 'Nije pronađen klub za ovaj nalog' });

  const { data: club } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', owner.club_id)
    .single();

  res.json(club);
});

// GET /api/club-auth/genres
router.get('/genres', (req, res) => {
  res.json(GENRES);
});

module.exports = router;
