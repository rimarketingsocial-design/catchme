// Stripe is initialized but payment verification is skipped when key is placeholder
const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const Stripe = require('stripe');
const stripe = new Stripe(key);
module.exports = stripe;
