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
    .or(`sender_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
    .single();

  if (error) return res.status(404).json({ error: 'Message not found' });

  // Mark as read if receiver
  if (data.receiver_id === req.userId && !data.read) {
    await supabase.from('messages').update({ read: true }).eq('id', req.params.id);
  }

  res.json(data);
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

  // Verify payment
  const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
  if (intent.status !== 'succeeded') {
    return res.status(402).json({ error: 'Payment not completed' });
  }

  const expectedAmount = MESSAGE_PRICES[intention_type];
  if (intent.amount < expectedAmount) {
    return res.status(402).json({ error: 'Insufficient payment amount' });
  }

  // Record payment
  await supabase.from('payments').upsert({
    user_id: req.userId,
    type: 'message',
    amount: intent.amount,
    stripe_payment_id: payment_intent_id,
    status: 'succeeded',
    metadata: { receiver_id, club_id, intention_type },
  });

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

module.exports = router;
