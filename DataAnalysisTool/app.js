/**
 * Pisces Flower — Analytics Dashboard
 *
 * Vanilla JS 数据分析面板
 * 数据来源：后端 /api/analytics/* 聚合接口
 * 图表库：Chart.js (CDN)
 */

const API_BASE = 'http://localhost:5000';

// ---- Chart.js 全局默认配置 ----
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.color = '#666';

// ---- 缓存的 Chart 实例（便于销毁重建） ----
let chartMethod = null;
let chartStatus = null;
let chartMonthly = null;
let chartAreas = null;
let chartAreaDetail = null;
let chartAreaProducts = null;
let chartProducts = null;

// ---- 状态 ---- 
let allMonthlyData = null;
let currentYear = 'all';

// ============================================================
//  初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadAll();

  // 每 30 分钟自动刷新数据
  setInterval(() => {
    loadAll();
  }, 30 * 60 * 1000);

  // 返回按钮：恢复主页面，回到地区列表
  const backBtn = document.getElementById('btn-back-areas');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      document.getElementById('tab-area-detail').style.display = 'none';
      document.getElementById('page-main').style.display = '';
      document.getElementById('tab-areas').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // 事件委托：点击地区链接打开详情
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.suburb-link');
    if (link) {
      const suburb = link.dataset.suburb;
      if (suburb) openAreaDetail(suburb);
    }
  });
});

async function loadAll() {
  const btn = document.getElementById('btnRefresh');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    await Promise.all([
      loadSummary(),
      loadDeliveryAreas(),
      loadProducts(),
      // loadMonthlyProducts(),
    ]);
    document.getElementById('lastUpdate').textContent = `Last updated: ${new Date().toLocaleString()}`;
  } catch (err) {
    console.error('[Dashboard] Load error:', err);
    showError('Failed to load data. Make sure the server is running on port 5000.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Refresh';
  }
}

function showError(msg) {
  // 在每个区块顶部显示错误
  ['tab-overview', 'tab-areas', 'tab-products'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let banner = el.querySelector('.error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'error-banner';
      el.prepend(banner);
    }
    banner.textContent = msg;
  });
}

// ============================================================
//  1. Overview — 总览数据
// ============================================================

async function loadSummary() {
  const res = await fetch(`${API_BASE}/api/analytics/summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // KPI 卡片
  document.getElementById('kpi-totalOrders').textContent = data.totalOrders;
  document.getElementById('kpi-totalRevenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
  document.getElementById('kpi-deliveryCount').textContent = `${data.deliveryCount} (${data.deliveryRatio}%)`;
  document.getElementById('kpi-pickupCount').textContent = `${data.pickupCount} (${data.pickupRatio}%)`;

  // Delivery vs Pickup 饼图
  renderMethodChart(data.deliveryCount, data.pickupCount);

  // 订单状态分布图
  renderStatusChart(data.statusCounts);

  // 月度趋势图
  allMonthlyData = data.monthly;
  buildYearTabs(data.monthly);
  renderMonthlyChart(data.monthly, currentYear);
  updateYearSummary(data.monthly, currentYear);
}

// ---- 年份切换 ----
let yearTabHandler = null;

function buildYearTabs(monthly) {
  const container = document.getElementById('yearTabs');
  if (!container) return;

  const years = [...new Set(monthly.map(m => m.month.split('-')[0]))].sort();
  let html = '<button class="year-tab" data-year="all">All</button>';
  for (const y of years) {
    html += `<button class="year-tab" data-year="${y}">${y}</button>`;
  }
  container.innerHTML = html;

  // 根据 currentYear 设置高亮
  container.querySelectorAll('.year-tab').forEach(b => {
    if (b.dataset.year === currentYear) b.classList.add('active');
  });
  // 如果 currentYear 不合法（如数据刷新后该年不存在），回退到 All
  if (!container.querySelector('.year-tab.active')) {
    const allBtn = container.querySelector('[data-year="all"]');
    if (allBtn) { allBtn.classList.add('active'); currentYear = 'all'; }
  }

  // 移除旧监听，避免重复绑定
  if (yearTabHandler) container.removeEventListener('click', yearTabHandler);
  yearTabHandler = (e) => {
    const btn = e.target.closest('.year-tab');
    if (!btn) return;
    container.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentYear = btn.dataset.year;
    renderMonthlyChart(allMonthlyData, currentYear);
    updateYearSummary(allMonthlyData, currentYear);
  };
  container.addEventListener('click', yearTabHandler);
}

function updateYearSummary(monthly, yearFilter) {
  const el = document.getElementById('yearSummary');
  if (!el) return;

  if (yearFilter === 'all') {
    el.style.display = 'none';
    return;
  }

  const yearData = monthly.filter(m => m.month.startsWith(yearFilter));
  if (yearData.length === 0) {
    el.style.display = 'none';
    return;
  }

  el.style.display = '';

  const totalOrders = yearData.reduce((s, m) => s + m.orderCount, 0);
  const totalRevenue = yearData.reduce((s, m) => s + m.revenue, 0);
  const avgMonthly = Math.round(totalOrders / yearData.length);
  const busiest = yearData.reduce((a, b) => a.orderCount > b.orderCount ? a : b);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const busiestMonth = months[parseInt(busiest.month.split('-')[1]) - 1];

  document.getElementById('yearSummaryOrders').textContent = totalOrders;
  document.getElementById('yearSummaryRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('yearSummaryAvg').textContent = `${avgMonthly} / mo`;
  document.getElementById('yearSummaryBusiest').textContent = `${busiestMonth} (${busiest.orderCount})`;
}

function renderMonthlyChart(monthly, yearFilter = 'all') {
  const ctx = document.getElementById('chartMonthly').getContext('2d');
  if (chartMonthly) chartMonthly.destroy();

  if (!monthly || monthly.length === 0) return;

  let filtered;
  if (yearFilter === 'all') {
    filtered = monthly;
  } else {
    // 补全该年 12 个月，无数据的月份填 0
    const yearData = {};
    for (const m of monthly) {
      if (m.month.startsWith(yearFilter)) {
        yearData[m.month] = m;
      }
    }
    filtered = [];
    for (let mo = 1; mo <= 12; mo++) {
      const key = `${yearFilter}-${String(mo).padStart(2, '0')}`;
      if (yearData[key]) {
        filtered.push(yearData[key]);
      } else {
        filtered.push({ month: key, orderCount: 0, revenue: 0, deliveryCount: 0, pickupCount: 0 });
      }
    }
  }

  if (filtered.length === 0) return;

  const labels = filtered.map(m => {
    const [y, mo] = m.month.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return yearFilter === 'all' ? `${months[parseInt(mo) - 1]} ${y}` : months[parseInt(mo) - 1];
  });

  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: filtered.map(m => m.orderCount),
          backgroundColor: '#4a6cf7',
          borderRadius: 4,
          order: 2,
        },
        {
          label: 'Revenue ($)',
          data: filtered.map(m => m.revenue),
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          yAxisID: 'y1',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === 'Revenue ($)') {
                return `Revenue: $${ctx.parsed.y.toFixed(2)}`;
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          title: { display: true, text: 'Orders' },
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: { display: false },
          title: { display: true, text: 'Revenue ($)' },
        },
      },
    },
  });
}

function renderMethodChart(delivery, pickup) {
  const ctx = document.getElementById('chartMethod').getContext('2d');
  if (chartMethod) chartMethod.destroy();

  chartMethod = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Delivery', 'Pickup'],
      datasets: [{
        data: [delivery, pickup],
        backgroundColor: ['#4a6cf7', '#f59e0b'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true },
        },
      },
    },
  });
}

function renderStatusChart(statusCounts) {
  const ctx = document.getElementById('chartStatus').getContext('2d');
  if (chartStatus) chartStatus.destroy();

  const labels = Object.keys(statusCounts);
  const values = Object.values(statusCounts);

  // 状态名美化
  const labelMap = {
    'on-hold': 'On Hold',
    'processing': 'Processing',
    'completed': 'Completed',
    'shipped': 'Shipped',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded',
    'pending': 'Pending',
    'failed': 'Failed',
    'ready-for-pickup': 'Ready for Pickup',
    'picked-up': 'Picked Up',
  };

  const colors = [
    '#f59e0b', '#4a6cf7', '#10b981', '#3b82f6',
    '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
    '#06b6d4', '#84cc16',
  ];

  chartStatus = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => labelMap[l] || l),
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true },
        },
      },
    },
  });
}

// ============================================================
//  2. Delivery Areas — 配送地区分析
// ============================================================

async function loadDeliveryAreas() {
  const res = await fetch(`${API_BASE}/api/analytics/delivery-areas`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const areas = data.areas || [];

  document.getElementById('areas-hint').textContent =
    `Total delivery orders: ${data.totalDeliveryOrders} | Areas served: ${areas.length}`;

  // 柱状图
  renderAreasChart(areas);
  renderDeliveryMap(areas);

  // 表格
  const tbody = document.getElementById('areasBody');
  tbody.innerHTML = '';

  if (areas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8899aa;">No delivery data available.</td></tr>';
    return;
  }

  areas.forEach((area, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-col">${i + 1}</td>
      <td class="suburb-link" data-suburb="${area.suburb}"><span>${area.suburb || 'Unknown'}</span></td>
      <td style="font-weight:600;">${area.orderCount}</td>
      <td>$${area.totalRevenue.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAreasChart(areas) {
  const ctx = document.getElementById('chartAreas').getContext('2d');
  if (chartAreas) chartAreas.destroy();

  const labels = areas.map(a => a.suburb || 'Unknown');
  const values = areas.map(a => a.orderCount);

  chartAreas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Orders',
        data: values,
        backgroundColor: '#4a6cf7',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
        y: {
          ticks: { font: { size: 11 } },
        },
      },
    },
  });
}

// ============================================================
//  3. Products — 商品分析
// ============================================================

async function loadProducts() {
  const res = await fetch(`${API_BASE}/api/analytics/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const products = data.products || [];

  document.getElementById('products-hint').textContent =
    `Total products sold: ${products.length} | Delivery orders: ${data.totalDeliveryOrders} | Pickup orders: ${data.totalPickupOrders}`;

  // 柱状图（Top 15）
  renderProductsChart(products.slice(0, 15));

  // 表格
  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = '';

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8899aa;">No product data available.</td></tr>';
    return;
  }

  products.forEach((p, i) => {
    const deliveryPct = p.deliveryRatio;
    const category = p.category || '-';
    // 为分类名设置标签色
    const catColors = {
      'Fresh Flowers': '#10b981',
      'Dried Flowers': '#f59e0b',
      'Flower Box': '#8b5cf6',
      'Anniversary Flowers': '#ec4899',
      'Celebration Flowers': '#3b82f6',
      'Get Well Soon Flowers': '#ef4444',
      'New Baby Flowers': '#06b6d4',
      'Graduation Flowers': '#84cc16',
      'Sympathy Flowers': '#64748b',
    };
    const catColor = catColors[category] || '#8899aa';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-col">${i + 1}</td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:#fff;background:${catColor};">${category}</span></td>
      <td class="product-name">${p.name}</td>
      <td>${p.totalQty}</td>
      <td>$${p.totalRevenue.toFixed(2)}</td>
      <td>$${p.unitPrice?.toFixed(2) || '—'}</td>
      <td>${p.deliveryQty}</td>
      <td>${p.pickupQty}</td>
      <td>
        <div class="delivery-pct-cell">
          <span class="delivery-pct-bar"><span class="fill" style="width:${deliveryPct}%"></span></span>
          <span class="delivery-pct-value">${deliveryPct}%</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderProductsChart(products) {
  const ctx = document.getElementById('chartProducts').getContext('2d');
  if (chartProducts) chartProducts.destroy();

  // 截断过长商品名
  const labels = products.map(p =>
    p.name.length > 30 ? p.name.slice(0, 28) + '...' : p.name
  );

  chartProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Delivery',
          data: products.map(p => p.deliveryQty),
          backgroundColor: '#4a6cf7',
          borderRadius: 4,
        },
        {
          label: 'Pickup',
          data: products.map(p => p.pickupQty),
          backgroundColor: '#f59e0b',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 10 } },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

// ============================================================
//  4. Monthly Products — 按月 × 商品交叉表
// ============================================================

// async function loadMonthlyProducts() {
//   const res = await fetch(`${API_BASE}/api/analytics/monthly-products`);
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   const data = await res.json();

//   const { rows, months, products } = data;
//   document.getElementById('monthly-products-hint').textContent =
//     `${months.length} months × ${products.length} products`;

//   // 构建 (month, productId) -> qty 的映射
//   const qtyMap = {};
//   let maxQty = 0;
//   for (const r of rows) {
//     const key = `${r.month}|${r.productId}`;
//     qtyMap[key] = r.qty;
//     if (r.qty > maxQty) maxQty = r.qty;
//   }

//   // 计算各商品总计和每月小计
//   const productTotals = {};
//   for (const p of products) productTotals[p.id] = 0;
//   const monthTotals = {};
//   for (const m of months) monthTotals[m] = 0;
//   let grandTotal = 0;

//   for (const r of rows) {
//     productTotals[r.productId] = (productTotals[r.productId] || 0) + r.qty;
//     monthTotals[r.month] = (monthTotals[r.month] || 0) + r.qty;
//     grandTotal += r.qty;
//   }

//   // 分别计算三个维度的最大值
//   const bodyMax = Math.max(...Object.values(qtyMap), 1);
//   const monthTotalMax = Math.max(...Object.values(monthTotals), 1);
//   const productTotalMax = Math.max(...Object.values(productTotals), 1);

//   // 热力色样式
//   function heatStyle(val, max) {
//     if (!val || max <= 0) return 'text-align:center;color:#bbb;';
//     const i = val / max;
//     const r = Math.round(240 - i * 210);
//     const g = Math.round(245 - i * 195);
//     const b = Math.round(255 - i * 110);
//     const color = i > 0.45 ? '#fff' : '#1a1a2e';
//     const weight = i > 0.45 ? '700' : '600';
//     return `background:rgb(${r},${g},${b});color:${color};font-weight:${weight};text-align:center;`;
//   }

//   function cellHtml(val, max) {
//     if (!val || max <= 0) return '<td style="text-align:center;color:#bbb;">-</td>';
//     return `<td style="${heatStyle(val, max)}">${val}</td>`;
//   }

//   // 渲染表头（加一列"Total"）
//   const thead = document.getElementById('monthlyProductsHead');
//   let headerHtml = '<tr><th>Month</th>';
//   for (const p of products) {
//     const shortName = p.name.length > 30 ? p.name.slice(0, 28) + '...' : p.name;
//     headerHtml += `<th title="${p.name}">${shortName}</th>`;
//   }
//   headerHtml += '<th>Total</th></tr>';
//   thead.innerHTML = headerHtml;

//   // 渲染表格体
//   const tbody = document.getElementById('monthlyProductsBody');
//   tbody.innerHTML = '';

//   const monthsLabel = {
//     '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
//     '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
//   };

//   for (const m of months) {
//     const [y, mo] = m.split('-');
//     const label = `${monthsLabel[mo] || mo} ${y}`;
//     const tr = document.createElement('tr');
//     const monthTotal = monthTotals[m] || 0;

//     let rowHtml = `<td><strong>${label}</strong></td>`;
//     for (const p of products) {
//       const qty = qtyMap[`${m}|${p.id}`] || 0;
//       rowHtml += cellHtml(qty, bodyMax);
//     }
//     // 本月小计（按 monthTotalMax 独立热力色）
//     rowHtml += `<td style="${heatStyle(monthTotal, monthTotalMax)}">${monthTotal}</td>`;
//     rowHtml += '</tr>';
//     tr.innerHTML = rowHtml;
//     tbody.appendChild(tr);
//   }

//   // 总计行（按 productTotalMax 独立热力色）
//   const totalTr = document.createElement('tr');
//   let totalHtml = '<td style="font-weight:700;background:#e8ecf0;">Total</td>';
//   for (const p of products) {
//     const total = productTotals[p.id] || 0;
//     totalHtml += cellHtml(total, productTotalMax);
//   }
//   totalHtml += `<td style="background:rgb(20,45,140);color:#fff;font-weight:700;text-align:center;padding:10px 8px;">${grandTotal}</td>`;
//   totalHtml += '</tr>';
//   totalTr.innerHTML = totalHtml;
//   tbody.appendChild(totalTr);
// }

// ============================================================
//  5. Area Detail — 配送地区详情
// ============================================================

let currentAreaSuburb = null;

// 点击 suburb 时调用
function openAreaDetail(suburb) {
  currentAreaSuburb = suburb;

  // 切换到详情页
  document.getElementById('page-main').style.display = 'none';
  const el = document.getElementById('tab-area-detail');
  el.style.display = '';
  document.getElementById('area-detail-title').textContent = `Area: ${suburb}`;
  loadAreaDetail(suburb);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 绑定返回按钮和地区点击
document.addEventListener('DOMContentLoaded', () => {
  // 事件委托：点击地区链接打开详情
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.suburb-link');
    if (link) {
      const suburb = link.dataset.suburb;
      if (suburb) openAreaDetail(suburb);
    }
  });
});

async function loadAreaDetail(suburb) {
  const res = await fetch(`${API_BASE}/api/analytics/delivery-area/${encodeURIComponent(suburb)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // KPI
  document.getElementById('ad-orders').textContent = data.orderCount;
  document.getElementById('ad-revenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
  document.getElementById('ad-customers').textContent = data.uniqueCustomers;
  document.getElementById('ad-topProduct').textContent = data.topProducts[0]?.name || '—';
  document.getElementById('area-detail-hint').textContent = `${data.orderCount} orders, ${data.uniqueCustomers} unique customers`;

  // Monthly trend chart
  renderAreaTrend(data.monthlyTrend);

  // Top products chart
  renderAreaTopProducts(data.topProducts);

  // Recent Orders table
  const tbody = document.getElementById('ad-orders-body');
  tbody.innerHTML = '';
  for (const o of data.recentOrders) {
    const tr = document.createElement('tr');
    const date = new Date(o.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const items = o.items.map(i => `${i.name} (×${i.qty})`).join(', ');
    tr.innerHTML = `<td style="white-space:nowrap;font-size:12px;">${date}</td>
      <td><strong>${o.customer}</strong></td>
      <td style="font-size:12px;color:#666;">${items}</td>
      <td>$${o.total.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  }
  if (data.recentOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8899aa;">No orders found.</td></tr>';
  }
}

function renderAreaTrend(monthlyTrend) {
  const ctx = document.getElementById('chartAreaDetail').getContext('2d');
  if (chartAreaDetail) chartAreaDetail.destroy();

  if (!monthlyTrend || monthlyTrend.length === 0) return;

  const labels = monthlyTrend.map(m => m.month);
  const monthsAbbr = labels.map(m => {
    const [y, mo] = m.split('-');
    const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${ms[parseInt(mo) - 1]} ${y}`;
  });

  chartAreaDetail = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthsAbbr,
      datasets: [
        {
          label: 'Orders',
          data: monthlyTrend.map(m => m.orderCount),
          backgroundColor: '#4a6cf7',
          borderRadius: 4,
          order: 2,
        },
        {
          label: 'Revenue ($)',
          data: monthlyTrend.map(m => m.revenue),
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          yAxisID: 'y1',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label === 'Revenue ($)'
              ? `Revenue: $${ctx.parsed.y.toFixed(2)}`
              : `${ctx.dataset.label}: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Orders' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Revenue ($)' } },
      },
    },
  });
}

function renderAreaTopProducts(topProducts) {
  const ctx = document.getElementById('chartAreaProducts').getContext('2d');
  if (chartAreaProducts) chartAreaProducts.destroy();

  if (!topProducts || topProducts.length === 0) return;

  const labels = topProducts.slice(0, 10).map(p =>
    p.name.length > 25 ? p.name.slice(0, 23) + '...' : p.name
  );

  chartAreaProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Qty Sold',
        data: topProducts.slice(0, 10).map(p => p.qty),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1 } },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  });
}

// ============================================================
//  Delivery Map — Leaflet 气泡地图
// ============================================================

const suburbCoords = {
  'Melbourne CBD': [-37.8136, 144.9631],
  'Southbank': [-37.8200, 144.9600],
  'Port Melbourne': [-37.8267, 144.9400],
  'Richmond': [-37.8231, 145.0019],
  'South Yarra': [-37.8383, 144.9917],
  'Windsor': [-37.8517, 144.9917],
  'St Kilda': [-37.8676, 144.9800],
  'Armadale': [-37.8550, 145.0167],
  'Malvern': [-37.8583, 145.0250],
  'Camberwell': [-37.8322, 145.0694],
  'Bentleigh': [-37.9181, 145.0356],
};

let deliveryMap;

function renderDeliveryMap(areas) {
  const container = document.getElementById('deliveryMap');
  if (!container) return;

  if (deliveryMap) { deliveryMap.remove(); deliveryMap = null; }

  deliveryMap = L.map('deliveryMap', { zoomSnap: 0.5, zoomDelta: 0.5 })
    .setView([-37.85, 144.98], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(deliveryMap);

  setTimeout(() => deliveryMap.invalidateSize(), 100);

  const maxOrders = Math.max(...areas.map(a => a.orderCount), 1);
  const maxRevenue = Math.max(...areas.map(a => a.totalRevenue), 1);

  areas.forEach(area => {
    const coord = suburbCoords[area.suburb];
    if (!coord) return;

    const radius = 15 + (area.orderCount / maxOrders) * 35;
    const intensity = area.totalRevenue / maxRevenue;
    const r = Math.round(30 + (1 - intensity) * 120);
    const g = Math.round(60 + (1 - intensity) * 100);
    const b = Math.round(140 + (1 - intensity) * 115);

    // 外圈（半透明描边）
    L.circleMarker(coord, {
      radius: radius + 4,
      color: '#fff',
      weight: 3,
      opacity: 0.8,
      fill: false,
    }).addTo(deliveryMap);

    // 内圈（填充色）
    const circle = L.circleMarker(coord, {
      radius,
      fillColor: `rgb(${r},${g},${b})`,
      color: '#fff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.85,
    }).addTo(deliveryMap);

    // 数字标签（用自定义图标居中显示订单数）
    const icon = L.divIcon({
      className: 'map-label',
      html: `<strong>${area.orderCount}</strong>`,
      iconSize: [40, 20],
      iconAnchor: [20, 10],
    });
    L.marker(coord, { icon, interactive: false, keyboard: false }).addTo(deliveryMap);

    // 鼠标悬停显示详情
    circle.bindTooltip(
      `<strong>${area.suburb}</strong><br>Orders: ${area.orderCount}<br>Revenue: $${area.totalRevenue}`,
      { direction: 'top', offset: [0, -radius - 10] }
    );

    circle.on('click', () => {
      const link = document.querySelector(`.suburb-link[data-suburb="${area.suburb}"]`);
      if (link) link.click();
      else openAreaDetail(area.suburb);
    });
  });

  // 自适应视图
  const allCoords = areas.map(a => suburbCoords[a.suburb]).filter(Boolean);
  if (allCoords.length > 0) {
    deliveryMap.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
  }
}
