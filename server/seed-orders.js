/**
 * WooCommerce 测试订单生成脚本
 *
 * 运行方式：cd server && node seed-orders.js
 * 前置条件：.env 中配置了 WC_URL / WC_KEY / WC_SECRET
 *
 * 生成约 60 笔订单，覆盖：
 *   - 11 个配送区域（suburb）
 *   - 10 种商品
 *   - delivery / pickup 混合
 *   - 多种订单状态
 *   - 2026年4月 ~ 6月的时间分布
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

// ============================================================
//  数据定义
// ============================================================

const SUBURBS = [
  'Melbourne CBD', 'Armadale', 'Bentleigh', 'Camberwell',
  'Malvern', 'Richmond', 'St Kilda', 'South Yarra',
  'Windsor', 'Southbank', 'Port Melbourne',
  'Clayton', 'Glen Waverley', 'Brighton', 'Hawthorn',
  'Caulfield', 'Carnegie', 'Moorabbin',
  'Cranbourne', 'Werribee', 'Frankston',
];

const SUBURB_COORDS = {
  'Melbourne CBD': [-37.8136, 144.9631],
  'Armadale': [-37.8550, 145.0167],
  'Bentleigh': [-37.9181, 145.0356],
  'Camberwell': [-37.8322, 145.0694],
  'Malvern': [-37.8583, 145.0250],
  'Richmond': [-37.8231, 145.0019],
  'St Kilda': [-37.8676, 144.9800],
  'South Yarra': [-37.8383, 144.9917],
  'Windsor': [-37.8517, 144.9917],
  'Southbank': [-37.8200, 144.9600],
  'Port Melbourne': [-37.8267, 144.9400],
  'Clayton': [-37.9180, 145.1200],
  'Glen Waverley': [-37.8780, 145.1670],
  'Brighton': [-37.9050, 144.9970],
  'Hawthorn': [-37.8220, 145.0360],
  'Caulfield': [-37.8780, 145.0230],
  'Carnegie': [-37.8950, 145.0570],
  'Moorabbin': [-37.9410, 145.0520],
  'Cranbourne': [-38.1131, 145.2787],
  'Werribee': [-37.9023, 144.6598],
  'Frankston': [-38.1434, 145.1220],
};

// 店铺位置（Oakleigh South）
const STORE_LOCATION = { lat: -37.92, lng: 145.09 };
const MAX_DELIVERY_KM = 20;

const STREETS = [
  '123 Main St', '45 Queen St', '78 King St', '12 Park Rd',
  '67 George St', '34 Church St', '56 High St', '89 Market St',
  '21 River Rd', '90 Station St', '43 Garden Ave', '76 Grove Ln',
];

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Edward',
  'Fiona', 'George', 'Helen', 'Ivan', 'Julia',
  'Kevin', 'Linda', 'Michael', 'Nancy', 'Oscar',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
];

const PRODUCTS = [
  { id: 28, name: 'Seasonal Blossom Box', price: 119 },
  { id: 27, name: 'Native Flower Bouquet', price: 79 },
  { id: 26, name: 'Summer Daisy (Incl vase)', price: 89 },
  { id: 25, name: 'Red Medium Blossom', price: 79 },
  { id: 24, name: 'JoJo Dried Flower Bouquet (Best Seller)', price: 99 },
  { id: 23, name: 'Pink Medium Blossom', price: 79 },
  { id: 22, name: 'Red Rose Romantic Bouquet', price: 88 },
  { id: 21, name: 'Native Medium Blossom (Best Seller)', price: 79 },
  { id: 20, name: 'Daily Bright Blossom (Seasonal Flowers) Flower Bouquet (Best Seller)', price: 99 },
  { id: 19, name: 'Premium Tulips Flower Bouquet', price: 79 },
];

const STATUSES = ['completed', 'completed', 'completed', 'processing', 'on-hold'];

// ============================================================
//  辅助函数
// ============================================================

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成 2025年 随机日期，月份有自然权重分布
 *   2月（情人节）、5月（母亲节）、12月（圣诞）略多
 *   6-8月（冬季）略少
 */
function randomDate() {
  // 月份权重：1-12月，权重越高越容易被选中
  const monthWeights = [1, 1.6, 1, 1, 1.5, 0.7, 0.7, 0.7, 1, 1, 1, 1.6];
  
  // 按权重随机选月份
  const totalWeight = monthWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  let month = 0;
  for (let i = 0; i < monthWeights.length; i++) {
    r -= monthWeights[i];
    if (r <= 0) { month = i; break; }
  }

  const daysInMonth = new Date(2025, month + 1, 0).getDate();
  const d = new Date(2025, month, randomInt(1, daysInMonth));
  d.setHours(randomInt(9, 18), randomInt(0, 59), randomInt(0, 59));
  return d;
}

/**
 * 生成订单商品列表（1~3件）
 * 热门商品权重更高
 */
function generateItems() {
  const count = randomInt(1, 3);
  const items = [];
  const usedIds = new Set();

  // 加权：热门商品（19, 20, 22, 24）更容易被选中
  const weightedProducts = [
    ...PRODUCTS.filter(p => [19, 20, 22, 24].includes(p.id)).flatMap(p => [p, p, p]),
    ...PRODUCTS,
  ];

  for (let i = 0; i < count; i++) {
    let product;
    let attempts = 0;
    do {
      product = randomItem(weightedProducts);
      attempts++;
    } while (usedIds.has(product.id) && attempts < 10);

    usedIds.add(product.id);
    items.push({
      product_id: product.id,
      quantity: randomInt(1, 3),
      price: product.price.toFixed(2),
    });
  }

  return items;
}

// ============================================================
//  距离计算（Haversine）
// ============================================================

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function canDeliver(suburb) {
  const coord = SUBURB_COORDS[suburb];
  if (!coord) return false;
  const dist = haversineKm(STORE_LOCATION.lat, STORE_LOCATION.lng, coord[0], coord[1]);
  return dist <= MAX_DELIVERY_KM;
}

// ============================================================
//  主逻辑
// ============================================================

async function seedOrders() {
  console.log('=== 开始生成测试订单 ===\n');

  // 先清空所有现有订单
  console.log('正在清空现有订单...');
  try {
    let allExisting = [];
    let page = 1;
    let totalPages = 1;

    const firstRes = await wcApi.get('orders', { per_page: 100, page: 1 });
    totalPages = parseInt(firstRes.headers['x-wp-totalpages'], 10) || 1;
    allExisting = firstRes.data;

    for (let p = 2; p <= totalPages; p++) {
      const res = await wcApi.get('orders', { per_page: 100, page: p });
      allExisting = allExisting.concat(res.data);
    }

    for (const order of allExisting) {
      await wcApi.delete(`orders/${order.id}`, { force: true });
    }
    console.log(`已删除 ${allExisting.length} 笔旧订单\n`);
  } catch (err) {
    console.log('清空时出错（可能没有旧订单）:', err.message, '\n');
  }

  // 生成新订单（随机 80~200 笔）
  const TOTAL_ORDERS = randomInt(80, 200);
  let created = 0;
  let failed = 0;
  const deliveryCounts = {};

  // 先删除已有客户（避免邮箱冲突）
  console.log('正在清理旧客户...');
  try {
    const { data: customers } = await wcApi.get('customers', { per_page: 100 });
    for (const c of customers) {
      try {
        await wcApi.delete(`customers/${c.id}`, { force: true });
      } catch { /* ignore */ }
    }
    console.log(`已删除 ${customers.length} 个旧客户\n`);
  } catch { /* ignore */ }

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    try {
      const firstName = randomItem(FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@example.com`;
      const suburb = randomItem(SUBURBS);
      const isDelivery = canDeliver(suburb) && Math.random() < 0.6; // 60% delivery (仅限 20km 内)

      const rawDate = randomDate();
      const deliveryDate = rawDate.toISOString().split('T')[0];

      const orderData = {
        payment_method: 'stripe',
        payment_method_title: 'Credit Card',
        status: randomItem(STATUSES),
        date_created: rawDate.toISOString(),
        billing: {
          first_name: firstName,
          last_name: lastName,
          address_1: randomItem(STREETS),
          city: suburb,
          state: 'VIC',
          postcode: String(randomInt(3000, 3207)),
          country: 'AU',
          email,
          phone: `04${randomInt(10000000, 99999999)}`,
        },
        shipping: {
          first_name: firstName,
          last_name: lastName,
          address_1: isDelivery ? randomItem(STREETS) : '',
          city: isDelivery ? suburb : '',
          state: isDelivery ? 'VIC' : '',
          postcode: isDelivery ? String(randomInt(3000, 3207)) : '',
          country: isDelivery ? 'AU' : '',
        },
        line_items: generateItems(),
        meta_data: [
          {
            key: 'delivery_method',
            value: isDelivery ? 'Delivery' : 'Pickup',
          },
          {
            key: 'Delivery Date',
            value: deliveryDate,
          },
        ],
      };

      await wcApi.post('orders', orderData);

      // 统计配送地区
      if (isDelivery) {
        deliveryCounts[suburb] = (deliveryCounts[suburb] || 0) + 1;
      }

      created++;
      if (created % 10 === 0) {
        console.log(`  已创建 ${created}/${TOTAL_ORDERS} 笔订单`);
      }
    } catch (err) {
      failed++;
      console.error(`  第 ${i + 1} 笔订单创建失败:`, err.response?.data?.message || err.message);
    }
  }

  // 输出统计
  console.log(`\n=== 生成完成 ===`);
  console.log(`成功: ${created} 笔`);
  console.log(`失败: ${failed} 笔`);

  const totalDelivery = Object.values(deliveryCounts).reduce((a, b) => a + b, 0);
  console.log(`配送订单: ${totalDelivery} 笔 (${Math.round(totalDelivery / created * 100)}%)`);
  console.log(`自提订单: ${created - totalDelivery} 笔 (${Math.round((created - totalDelivery) / created * 100)}%)`);

  console.log('\n配送地区分布:');
  Object.entries(deliveryCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([suburb, count]) => {
      const bar = '█'.repeat(Math.ceil(count / maxCount(Object.values(deliveryCounts)) * 20));
      console.log(`  ${suburb.padEnd(16)} ${count} 笔 ${bar}`);
    });

  console.log('\n执行以下命令验证数据:');
  console.log('  node -e "fetch(\'http://localhost:5000/api/analytics/summary\').then(r=>r.json()).then(console.log)"');
}

function maxCount(arr) {
  return Math.max(...arr, 1);
}

seedOrders().catch(err => {
  console.error('种子脚本出错:', err);
  process.exit(1);
});
