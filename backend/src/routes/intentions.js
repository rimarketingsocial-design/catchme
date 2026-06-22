const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const VALID_TYPES = ['poznanstvo', 'avantura', 'veza'];

// GET /api/intentions/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('intentions')
    .select('*')
    .eq('user_id', req.userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  res.json(data || null);
});

// POST /api/intentions — set or update intention (12h lock)
router.post('/', requireAuth, async (req, res) => {
  const { type } = req.body;

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  // Check existing intention and 12h lock
  const { data: existing } = await supabase
    .from('intentions')
    .select('type, updated_at')
    .eq('user_id', req.userId)
    .maybeSingle();

  if (existing?.updated_at) {
    const updatedAt = new Date(existing.updated_at);
    const msSince = Date.now() - updatedAt.getTime();
    const msLock = 12 * 60 * 60 * 1000;

    if (msSince < msLock) {
      const msRemaining = msLock - msSince;
      const hoursLeft = Math.floor(msRemaining / (60 * 60 * 1000));
      const minutesLeft = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
      return res.status(403).json({
        error: 'locked',
        hours_left: hoursLeft,
        minutes_left: minutesLeft,
        unlock_at: new Date(updatedAt.getTime() + msLock).toISOString(),
      });
    }
  }

  const { data, error } = await supabase
    .from('intentions')
    .upsert({ user_id: req.userId, type, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
