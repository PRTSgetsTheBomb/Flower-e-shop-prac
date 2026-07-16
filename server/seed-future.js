/**
 * 生成未来几天待配送模拟订单
 * 运行：cd server && node seed-future.js
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

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const orders = [
  { name: 'Mia', sub: 'Caulfield', addr: '23 Grove Ln', items: [{ pid: 24, qty: 1, msg: 'Happy Anniversary! 🎂' }], day: 1 },
  { name: 'Noah', sub: 'Hawthorn', addr: '89 Market St', items: [{ pid: 22, qty: 2 }, { pid: 19, qty: 1, msg: 'Get well soon 🌻' }], day: 1 },
  { name: 'Olivia', sub: 'Brighton', addr: '34 Church St', items: [{ pid: 20, qty: 1, msg: 'Thinking of you 💕' }], day: 2 },
  { name: 'Liam', sub: 'Glen Waverley', addr: '56 High St', items: [{ pid: 27, qty: 1 }, { pid: 25, qty: 1 }], day: 2 },
  { name: 'Emma', sub: 'Clayton', addr: '90 Station St', items: [{ pid: 28, qty: 1, msg: 'For the new home! 🏠' }], day: 3 },
  { name: 'Ethan', sub: 'Camberwell', addr: '43 Garden Ave', items: [{ pid: 23, qty: 3 }], day: 3 },
  { name: 'Sophia', sub: 'Carnegie', addr: '12 Park Rd', items: [{ pid: 24, qty: 1, msg: 'Just because 🌸' }, { pid: 26, qty: 1 }], day: 4 },
];

async function seed() {
  console.log('Creating future orders...\n');

  for (const o of orders) {
    const date = daysFromNow(o.day);
    try {
      const { data } = await wcApi.post('orders', {
        status: 'processing',
        payment_method: 'stripe',
        payment_method_title: 'Stripe (Card)',
        billing: {
          first_name: o.name, last_name: 'Test',
          email: `${o.name.toLowerCase()}@test.com`, phone: '0400 000 000',
          address_1: o.addr, city: o.sub, postcode: '3000',
        },
        shipping: {
          first_name: o.name, last_name: 'Test',
          address_1: o.addr, city: o.sub, postcode: '3000',
        },
        line_items: o.items.map(i => ({
          product_id: i.pid, quantity: i.qty, price: '99',
          meta_data: [
            { key: 'Delivery Date', value: date },
            { key: 'Delivery Method', value: 'Delivery' },
            ...(i.msg ? [{ key: 'Gift Message', value: i.msg }] : []),
          ],
        })),
        meta_data: [{ key: 'delivery_method', value: 'Delivery' }],
      });
      console.log(`  #${data.number} ${o.sub} → ${o.name} (${date}, day+${o.day}) — $${data.total}`);
    } catch (err) {
      console.error(`  ❌ ${o.name}:`, err.response?.data?.message || err.message);
    }
  }

  console.log('\nDone! Dashboard Today will stay empty until those dates arrive.');
}

seed();
