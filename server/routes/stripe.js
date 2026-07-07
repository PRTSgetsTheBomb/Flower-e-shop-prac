/**
 * Stripe 支付路由
 *
 * POST /create-payment-intent
 * 创建 Stripe PaymentIntent，返回 clientSecret 给前端
 */
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[Stripe] Error creating PaymentIntent:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
