const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/society — get my society connections
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('society')
    .select(`
      *,
      user_a_data:user_a(id, name, photo_url),
      user_b_data:user_b(id, name, photo_url),
      clubs(id, name)
    `)
    .or(`user_a.eq.${req.userId},user_b.eq.${req.userId}`)
    .order('unlocked_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const connections = (data || []).map(s => ({
    id: s.id,
    club: s.clubs,
    unlocked_at: s.unlocked_at,
    other_user: s.user_a === req.userId ? s.user_b_data : s.user_a_data,
  }));

  res.json(connections);
});

// Check society status after each message — call this internally
async function checkSociety(userId, otherUserId, clubId) {
  // Count messages between these two in this club (both directions)
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('payment_status', 'paid')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

  if (count >= 10) {
    const [a, b] = [userId, otherUserId].sort();
    await supabase
      .from('society')
      .upsert({ user_a: a, user_b: b, club_id: clubId }, { onConflict: 'user_a,user_b,club_id' });
    return true;
  }
  return false;
}

module.exports = router;
module.exports.checkSociety = checkSociety;
