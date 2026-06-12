const express = require('express');
const router = express.Router();
const stripe = require('../lib/stripe');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const PRICES = {
  checkin: 50,          // $0.50
  msg_poznanstvo: 100,  // $1.00
  msg_veza: 200,        // $2.00
  msg_avantura: 300,    // $3.00
};

// POST /api/payments/create-intent
router.post('/create-intent', requireAuth, async (req, res) => {
  const { type, intention_type } = req.body;

  let amount;
  let description;

  if (type === 'checkin') {
    amount = PRICES.checkin;
    description = 'CatchMe club check-in';
  } else if (type === 'message') {
    if (!intention_type || !PRICES[`msg_${intention_type}`]) {
      return res.status(400).json({ error: 'Invalid intention_type for message payment' });
    }
    amount = PRICES[`msg_${intention_type}`];
    description = `CatchMe message (${intention_type})`;
  } else {
    return res.status(400).json({ error: 'type must be "checkin" or "message"' });
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description,
      metadata: { user_id: req.userId, type, intention_type: intention_type || '' },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ client_secret: intent.client_secret, payment_intent_id: intent.id, amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook — Stripe webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    await supabase.from('payments')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_id', intent.id);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await supabase.from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_id', intent.id);
  }

  res.json({ received: true });
});

module.exports = router;
