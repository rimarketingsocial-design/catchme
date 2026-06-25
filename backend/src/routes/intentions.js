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

  // Check existing intention and 12h lock (use limit(1) to avoid multi-row errors)
  const { data: existingRows } = await supabase
    .from('intentions')
    .select('id, type, updated_at')
    .eq('user_id', req.userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const existing = existingRows?.[0] || null;

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

  // Update existing row if exists, otherwise insert
  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from('intentions')
      .update({ type, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('intentions')
      .insert({ user_id: req.userId, type, updated_at: new Date().toISOString() })
      .select()
      .single());
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
