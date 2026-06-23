const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const GENRES = ['House', 'Techno', 'Hip-Hop', 'R&B', 'Pop', 'Latino', 'Turbo-Folk', 'Rock', 'EDM', 'Commercial'];

// POST /api/club-auth/register
router.post('/register', async (req, res) => {
  const { email, password, club_name, address, genre, city, photo_url } = req.body;
  if (!email || !password || !club_name || !address || !genre || !city) {
    return res.status(400).json({ error: 'Sva polja su obavezna' });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user.id;

  // Create club record
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ name: club_name, address, genre, city, photo_url: photo_url || null })
    .select()
    .single();
  if (clubError) {
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: clubError.message });
  }

  // Link owner to club
  const { error: ownerError } = await supabase
    .from('club_owners')
    .insert({ auth_user_id: userId, club_id: club.id });
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
