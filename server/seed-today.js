/**
 * 生成今日模拟订单 — 用于测试 Dashboard Today 视图
 *
 * 运行：cd server && node seed-today.js
 * 前提：WordPress/WooCommerce 在 localhost:8080 运行中
 */

const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
require('dotenv').config();

const wcApi = new WooCommerceRestApi({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_KEY,
  consumerSecret: process.env.WC_SECRET,
  version: 'wc/v3',
  queryStringAuth: true,
});

const today = new Date().toISOString().split('T')[0]; // 2026-07-08

const orders = [
  {
    billing: { first_name: 'Emily', last_name: 'Chen', email: 'emily@test.com', phone: '0412 345 678' },
    shipping: { first_name: 'Emily', last_name: 'Chen', address_1: '45 Queen St', city: 'Carnegie', postcode: '3163' },
    line_items: [
      { product_id: 24, quantity: 1, price: '99', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Delivery' },
        { key: 'Gift Message', value: 'Happy Birthday! Love you always ❤️' },
        { key: 'Delivery Note', value: 'Please ring the bell twice, dog might bark' },
      ]},
    ],
    meta_data: [{ key: 'delivery_method', value: 'Delivery' }],
  },
  {
    billing: { first_name: 'James', last_name: 'Wilson', email: 'james@test.com', phone: '0401 234 567' },
    shipping: { first_name: 'James', last_name: 'Wilson', address_1: '12 Park Rd', city: 'Bentleigh', postcode: '3204' },
    line_items: [
      { product_id: 22, quantity: 2, price: '88', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Delivery' },
        { key: 'Delivery Note', value: 'Urgent — deliver before 10am please' },
      ]},
      { product_id: 20, quantity: 1, price: '99', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Delivery' },
        { key: 'Gift Message', value: 'Thank you for everything, Mum 🌸' },
      ]},
    ],
    meta_data: [{ key: 'delivery_method', value: 'Delivery' }],
  },
  {
    billing: { first_name: 'Sarah', last_name: 'Lee', email: 'sarah@test.com', phone: '0402 345 678' },
    shipping: { first_name: 'Sarah', last_name: 'Lee', address_1: '78 King St', city: 'Southbank', postcode: '3006' },
    line_items: [
      { product_id: 27, quantity: 1, price: '79', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Delivery' },
        { key: 'Gift Message', value: 'Congrats on the new job! 🎉' },
      ]},
    ],
    meta_data: [{ key: 'delivery_method', value: 'Delivery' }],
  },
  // --- Pickup orders ---
  {
    billing: { first_name: 'Tom', last_name: 'Brown', email: 'tom@test.com', phone: '0403 456 789' },
    shipping: { first_name: 'Tom', last_name: 'Brown', city: '', address_1: '' },
    line_items: [
      { product_id: 25, quantity: 1, price: '79', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Pickup' },
      ]},
      { product_id: 26, quantity: 1, price: '89', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Pickup' },
        { key: 'Gift Message', value: 'For the dinner party tonight 🍷' },
      ]},
    ],
    customer_note: 'Will pick up around 2pm.',
    meta_data: [{ key: 'delivery_method', value: 'Pickup' }],
  },
  {
    billing: { first_name: 'Lisa', last_name: 'Wang', email: 'lisa@test.com', phone: '0404 567 890' },
    shipping: { first_name: 'Lisa', last_name: 'Wang', city: '', address_1: '' },
    line_items: [
      { product_id: 28, quantity: 1, price: '119', meta_data: [
        { key: 'Delivery Date', value: today },
        { key: 'Delivery Method', value: 'Pickup' },
        { key: 'Gift Message', value: 'Anniversary surprise 💐' },
      ]},
    ],
    customer_note: 'Please wrap it nicely, it\'s a gift!',
    meta_data: [{ key: 'delivery_method', value: 'Pickup' }],
  },
];

async function seed() {
  console.log(`Creating ${orders.length} test orders for ${today}...\n`);

  for (const o of orders) {
    try {
      const { data } = await wcApi.post('orders', {
        ...o,
        status: 'processing',
        payment_method: 'stripe',
        payment_method_title: 'Stripe (Card)',
      });
      const method = o.meta_data[0]?.value === 'Delivery' ? '🚚 Delivery' : '📦 Pickup';
      const name = `${o.billing.first_name} ${o.billing.last_name}`;
      console.log(`  #${data.number} ${method} → ${name} — $${data.total}`);
    } catch (err) {
      console.error(`  ❌ Failed: ${o.billing.first_name} —`, err.response?.data?.message || err.message);
    }
  }

  console.log('\nDone! Refresh the dashboard.');
}

seed();
