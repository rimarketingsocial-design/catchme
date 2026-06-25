const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const stripe = require('../lib/stripe');
const { requireAuth } = require('../middleware/auth');

const MESSAGE_PRICES = {
  poznanstvo: 100, // $1.00
  veza: 200,       // $2.00
  avantura: 300,   // $3.00
};

// GET /api/messages/conversations — grouped by other user (for both genders)
router.get('/conversations', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, intention_type, read, created_at, sender_id, receiver_id,
      sender:sender_id(id, name, photo_url),
      receiver:receiver_id(id, name, photo_url),
      club:club_id(id, name)
    `)
    .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const map = new Map();
  for (const msg of data) {
    const isMe = msg.sender_id === req.userId;
    const otherId = isMe ? msg.receiver_id : msg.sender_id;
    const other = isMe ? msg.receiver : msg.sender;

    if (!map.has(otherId)) {
      map.set(otherId, {
        other_user_id: otherId,
        other_user: other,
        latest_content: msg.content,
        latest_time: msg.created_at,
        intention_type: msg.intention_type,
        club: msg.club,
        unread_count: 0,
        message_count: 0,
      });
    }
    const conv = map.get(otherId);
    conv.message_count++;
    if (!msg.read && msg.receiver_id === req.userId) conv.unread_count++;
  }

  res.json([...map.values()]);
});

// GET /api/messages/thread/:other_id — all messages between two users
router.get('/thread/:other_id', requireAuth, async (req, res) => {
  const otherId = req.params.other_id;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, sender_id, receiver_id, intention_type, read, created_at,
      club:club_id(id, name),
      sender:sender_id(id, name, photo_url),
      receiver:receiver_id(id, name, photo_url)
    `)
    .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${req.userId})`)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Mark as read
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', req.userId)
    .eq('sender_id', otherId)
    .eq('read', false);

  const other = data.find(m => m.sender_id === otherId)?.sender
    || data.find(m => m.receiver_id === otherId)?.receiver;

  res.json({ messages: data, other_user: other });
});

// POST /api/messages/reply-to/:other_id — free reply in existing conversation
router.post('/reply-to/:other_id', requireAuth, async (req, res) => {
  const otherId = req.params.other_id;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const { data: existing } = await supabase
    .from('messages')
    .select('id, club_id, intention_type')
    .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${req.userId})`)
    .eq('payment_status', 'paid')
    .limit(1);

  if (!existing?.length) return res.status(403).json({ error: 'No existing conversation' });

  const orig = existing[0];
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: req.userId,
      receiver_id: otherId,
      club_id: orig.club_id,
      content: content.trim(),
      intention_type: orig.intention_type,
      payment_status: 'paid',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const { checkSociety } = require('./society');
  checkSociety(req.userId, otherId, orig.club_id).catch(() => {});

  res.json(data);
});

// DELETE /api/messages/conversation/:other_id — delete entire conversation
router.delete('/conversation/:other_id', requireAuth, async (req, res) => {
  const otherId = req.params.other_id;
  const { error } = await supabase
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${req.userId})`);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/messages/inbox — female inbox
router.get('/inbox', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, intention_type, payment_status, read, created_at,
      sender:sender_id(id, name, photo_url),
      club:club_id(id, name)
    `)
    .eq('receiver_id', req.userId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/messages/sent — male sent messages
router.get('/sent', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, content, intention_type, payment_status, read, created_at,
      receiver:receiver_id(id, name, photo_url),
      club:club_id(id, name)
    `)
    .eq('sender_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/messages/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id(id, name, photo_url),
      receiver:receiver_id(id, name, photo_url),
      club:club_id(id, name)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Message not found' });

  // Access check: only sender or receiver can view
  if (data.sender_id !== req.userId && data.receiver_id !== req.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Mark as read if receiver
  if (data.receiver_id === req.userId && !data.read) {
    await supabase.from('messages').update({ read: true }).eq('id', req.params.id);
  }

  // Fetch replies between the same two users in same club, after original message
  const { data: replies } = await supabase
    .from('messages')
    .select('id, content, sender_id, created_at')
    .eq('club_id', data.club_id)
    .eq('payment_status', 'paid')
    .neq('id', req.params.id)
    .in('sender_id', [data.sender_id, data.receiver_id])
    .in('receiver_id', [data.sender_id, data.receiver_id])
    .gt('created_at', data.created_at)
    .order('created_at', { ascending: true });

  res.json({ ...data, replies: replies || [] });
});

// POST /api/messages — send message (males only, requires payment)
router.post('/', requireAuth, async (req, res) => {
  const { receiver_id, club_id, content, intention_type, payment_intent_id } = req.body;

  if (!receiver_id || !club_id || !content || !intention_type || !payment_intent_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!MESSAGE_PRICES[intention_type]) {
    return res.status(400).json({ error: 'Invalid intention_type' });
  }

  // Check if conversation already exists — skip payment entirely if so
  const { data: existingConvo } = await supabase
    .from('messages')
    .select('id')
    .or(`and(sender_id.eq.${req.userId},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${req.userId})`)
    .eq('payment_status', 'paid')
    .limit(1);

  if (existingConvo?.length) {
    return res.status(200).json({ existing: true, other_user_id: receiver_id });
  }

  const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('placeholder');

  if (!isTestMode) {
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    const expectedAmount = MESSAGE_PRICES[intention_type];
    if (intent.amount < expectedAmount) {
      return res.status(402).json({ error: 'Insufficient payment amount' });
    }

    await supabase.from('payments').upsert({
      user_id: req.userId,
      type: 'message',
      amount: intent.amount,
      stripe_payment_id: payment_intent_id,
      status: 'succeeded',
      metadata: { receiver_id, club_id, intention_type },
    });
  }

  // Create message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: req.userId,
      receiver_id,
      club_id,
      content,
      intention_type,
      payment_status: 'paid',
    })
    .select(`
      *,
      sender:sender_id(id, name, photo_url),
      receiver:receiver_id(id, name, photo_url)
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/messages/:id/reply — free reply from receiver
router.post('/:id/reply', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  // Get original message
  const { data: original, error: origErr } = await supabase
    .from('messages')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (origErr || !original) return res.status(404).json({ error: 'Message not found' });

  // Only the receiver can reply
  if (original.receiver_id !== req.userId) {
    return res.status(403).json({ error: 'Only the receiver can reply' });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: req.userId,
      receiver_id: original.sender_id,
      club_id: original.club_id,
      content: content.trim(),
      intention_type: original.intention_type,
      payment_status: 'paid',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Check if society unlocked (10+ messages)
  const { checkSociety } = require('./society');
  checkSociety(req.userId, original.sender_id, original.club_id).catch(() => {});

  res.json(data);
});

module.exports = router;
