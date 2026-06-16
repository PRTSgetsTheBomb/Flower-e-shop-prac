/**
 * 支付后端服务
 *
 * 核心职责：创建 Stripe PaymentIntent，返回 client_secret 给前端确认支付
 *
 * 启动方式：
 *   cd server && npm install && npm start
 *   默认运行在 http://localhost:5000
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /create-payment-intent
 * Body: { amount: number }  — 金额（美元，如 92.95）
 * Returns: { clientSecret: string }
 */
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe 以"分"为单位
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error('[Stripe] Error creating PaymentIntent:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
