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
let currentYear = new Date().getFullYear().toString();

// ---- 常量 ----
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = { primary: '#0d9488', revenue: '#10b981', pickup: '#f59e0b', area: '#d97706', product: '#6366f1' };

// ---- 共享插件 ----
/** 创建收益折线叠加插件 —— 在柱子之后画绿线和点，确保在上层 */
function createRevenueOverlay() {
  return {
    id: 'revenueOverlay',
    afterDatasetsDraw(chart) {
      const { ctx, scales, data } = chart;
      const x = scales.x, y1 = scales.y1;
      const pts = data.datasets[1].data;
      if (!y1 || !pts || pts.length === 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      let first = true;
      const dots = [];
      for (let i = 0; i < pts.length; i++) {
        if (pts[i] == null) continue;
        const px = x.getPixelForValue(i);
        const py = y1.getPixelForValue(pts[i]);
        if (px == null || py == null) continue;
        dots.push([px, py]);
        if (first) { ctx.moveTo(px, py); first = false; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      for (const [dx, dy] of dots) {
        ctx.beginPath(); ctx.arc(dx, dy, 5.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#10b981'; ctx.fill();
      }
      ctx.restore();
    },
  };
}

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
      return;
    }
    // 订单状态按钮
    const btn = e.target.closest('.today-action-btn');
    if (btn) {
      const status = btn.dataset.action;
      const oid = parseInt(btn.dataset.oid);
      if (status && oid) {
        if (status === 'cancelled') {
          if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
        }
        changeOrderStatus(oid, status);
      }
    }
  });
});

async function loadAll() {
  const btn = document.getElementById('btnRefresh');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  document.querySelectorAll('.error-banner').forEach(el => el.remove());

  // 读取当前筛选状态（保留用户选择，首次加载时为空则默认今天）
  let startDate = document.getElementById('filterStartDate').value;
  let endDate = document.getElementById('filterEndDate').value;
  const upcomingDays = document.getElementById('upcomingDays').value || '1';

  const isFirstLoad = !startDate && !endDate && !window._dashboardLoaded;
  if (isFirstLoad) {
    const today = new Date().toISOString().split('T')[0];
    startDate = today;
    endDate = today;
    document.getElementById('filterStartDate').value = today;
    document.getElementById('filterEndDate').value = today;
    const filterRow = document.querySelector('.date-filter-row');
    if (filterRow) filterRow.classList.add('filter-active');
    toggleFilterLabel(`Today: ${today}`);
    document.getElementById('btnAllToday').textContent = 'All';
    document.getElementById('upcomingDays').value = '1';
  }
  window._dashboardLoaded = true;

  try {
    await Promise.all([
      loadSummary(startDate, endDate),
      loadDeliveryAreas(startDate, endDate),
      loadProducts(startDate, endDate),
      loadTodayOrders(upcomingDays),
    ]);

    // Trend图表单独加载全量月度数据（始终显示全年趋势，不受日期筛选影响）
    const fullRes = await fetch(`${API_BASE}/api/analytics/summary`);
    if (fullRes.ok) {
      const fullData = await fullRes.json();
      allMonthlyData = fullData.monthly;
      window.allMonthlyData = fullData.monthly;
      buildYearTabs(fullData.monthly);
      renderMonthlyChart(fullData.monthly, currentYear);
      updateYearSummary(fullData.monthly, currentYear);
    }

    // AI 用：单独加载全量商品和区域数据（不受日期筛选影响）
    try {
      const fullProd = await fetch(`${API_BASE}/api/analytics/products`);
      if (fullProd.ok) window.allProductsData = (await fullProd.json()).products || [];
    } catch {}
    try {
      const fullArea = await fetch(`${API_BASE}/api/analytics/delivery-areas`);
      if (fullArea.ok) window.allAreasData = (await fullArea.json()).areas || [];
    } catch {}

    document.getElementById('lastUpdate').textContent = `Last updated: ${new Date().toLocaleString()}`;
  } catch (err) {
    console.error('[Dashboard] Load error:', err);
    showError('Failed to load data. Make sure the server is running on port 5000.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Refresh';
  }
}

// ---- 今日订单 ----
async function loadTodayOrders(days) {
  try {
    const d = days || 1;
    const res = await fetch(`${API_BASE}/api/analytics/today?days=${d}`);
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('todayDate').textContent = data.dateRange || data.date;
    const hintEl = document.getElementById('todayHint');
    const totalOrders = data.deliveryCount + data.pickupCount
      + ((data.onHold?.deliveries?.length || 0) + (data.onHold?.pickups?.length || 0))
      + ((data.completed?.deliveries?.length || 0) + (data.completed?.pickups?.length || 0));
    if (hintEl) hintEl.textContent =
      (d > 1 ? `Next ${d} days | ` : '') + `Total: ${totalOrders} orders`;

    // 头部计数
    const delCountHdr = document.getElementById('todayDelCount');
    if (delCountHdr) delCountHdr.textContent = data.deliveryCount;
    const pickCountHdr = document.getElementById('todayPickCount');
    if (pickCountHdr) pickCountHdr.textContent = data.pickupCount;

    const delCountEl = document.getElementById('todayDeliveryCount');
    if (delCountEl) delCountEl.textContent = data.deliveryCount;
    const pickCountEl = document.getElementById('todayPickupCount');
    if (pickCountEl) pickCountEl.textContent = data.pickupCount;

    // 配送列表
    const delList = document.getElementById('todayDeliveryList');
    if (delList) {
      if (data.deliveries.length === 0) {
        delList.innerHTML = '<p class="today-empty">No deliveries for today.</p>';
      } else {
        delList.innerHTML = data.deliveries.map(o => renderTodayOrder(o)).join('');
      }
    }

    // 自提列表
    const pickupList = document.getElementById('todayPickupList');
    if (pickupList) {
      if (data.pickups.length === 0) {
        pickupList.innerHTML = '<p class="today-empty">No pickups for today.</p>';
      } else {
        pickupList.innerHTML = data.pickups.map(o => renderTodayOrder(o)).join('');
      }
    }

    // On Hold 订单
    const holdData = data.onHold;
    const holdList = document.getElementById('todayOnHoldList');
    if (holdList && holdData) {
      const allHold = [...(holdData.deliveries || []), ...(holdData.pickups || [])];
      const holdCountHdr = document.getElementById('todayHoldCount');
      if (holdCountHdr) holdCountHdr.textContent = allHold.length;
      if (allHold.length === 0) {
        holdList.innerHTML = '<p class="today-empty">No orders on hold.</p>';
      } else {
        holdList.innerHTML = allHold.map(o => renderTodayOrder(o)).join('');
      }
    }

    // 已完成订单（从同一响应获取）
    const completedList = document.getElementById('todayCompletedList');
    const compData = data.completed;
    if (completedList && compData) {
      const allCompleted = [...(compData.deliveries || []), ...(compData.pickups || [])];
      const compCountHdr = document.getElementById('todayCompCount');
      if (compCountHdr) compCountHdr.textContent = allCompleted.length;
      const compCountEl = document.getElementById('kpi-completed');
      if (compCountEl) compCountEl.textContent = allCompleted.length;
      if (allCompleted.length === 0) {
        completedList.innerHTML = '<p class="today-empty">No completed orders for today.</p>';
      } else {
        completedList.innerHTML = allCompleted.map(o => renderTodayOrder(o)).join('');
      }
    }

    // 今日配送区域
    const areasList = document.getElementById('todayAreasList');
    if (areasList && data.deliveries.length > 0) {
      const suburbs = [...new Set(data.deliveries.map(o => {
        const parts = o.address.split(',');
        if (parts.length < 2) return '';
        return parts[1].trim().replace(/\s*\d+$/, '');
      }).filter(s => s && s !== 'Unknown'))].sort();
      const areasCountEl = document.getElementById('kpi-areasToday');
      if (areasCountEl) areasCountEl.textContent = suburbs.length;
      const areaCountHdr = document.getElementById('todayAreaCount');
      if (areaCountHdr) areaCountHdr.textContent = suburbs.length;
      // 店铺坐标 (Pisces Flower, Oakleigh South)
      const SHOP = [-37.92, 145.09];
      const haversineKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      // 按距离从近到远排序
      suburbs.sort((a, b) => {
        const da = suburbCoords[a] ? haversineKm(SHOP[0], SHOP[1], suburbCoords[a][0], suburbCoords[a][1]) : Infinity;
        const db = suburbCoords[b] ? haversineKm(SHOP[0], SHOP[1], suburbCoords[b][0], suburbCoords[b][1]) : Infinity;
        return da - db;
      });
      areasList.innerHTML = suburbs.map(s => {
        const coord = suburbCoords[s];
        const dist = coord ? haversineKm(SHOP[0], SHOP[1], coord[0], coord[1]) : null;
        const distStr = dist !== null ? `${dist.toFixed(1)} km` : '';
        // 统计该郊区的订单数
        const count = data.deliveries.filter(o => {
          const parts = o.address.split(',');
          if (parts.length < 2) return false;
          return parts[1].trim().replace(/\s*\d+$/, '') === s;
        }).length;
        return `<div class="today-order" style="padding:6px 10px;">
          <div class="today-order-head" style="font-size:13px;gap:6px;justify-content:space-between;">
            <span><strong>📍 ${s}</strong> <span style="color:#94a3b8;">×${count}</span></span>
            ${distStr ? `<span style="color:#d97706;font-size:11px;white-space:nowrap;">${distStr}</span>` : ''}
          </div>
        </div>`;
      }).join('');
    } else if (areasList) {
      const areasCountEl = document.getElementById('kpi-areasToday');
      if (areasCountEl) areasCountEl.textContent = '0';
      areasList.innerHTML = '<p class="today-empty">No areas today.</p>';
    }
  } catch (err) {
    console.error('[Today] Load error:', err);
  }
}

function renderTodayOrder(order) {
  const items = order.items.map(i => {
    let label = `${i.name} × ${i.qty}`;
    if (i.giftMessage) label += `<br><span class="today-gift">💬 "${i.giftMessage}"</span>`;
    return label;
  }).join('<br>');

  // 统一显示在订单级，去重
  const allNotes = [...new Set(order.items.map(i => i.deliveryNote).filter(Boolean))];
  const deliveryNote = allNotes.length > 0
    ? `<div class="today-note">📋 ${allNotes.join(' | ')}</div>`
    : '';

  const note = order.customerNote
    ? `<div class="today-note">📝 ${order.customerNote}</div>`
    : '';

  const statusLabels = {
    'processing': ['Processing', '#ffc107', '#333'],
    'fulfilled': ['Delivering', '#3b82f6', '#fff'],
    'shipped': ['Delivering', '#3b82f6', '#fff'],
    'readyforpickup': ['Ready', '#10b981', '#fff'],
    'on-hold': ['On Hold', '#f59e0b', '#fff'],
    'completed': ['Completed', '#28a745', '#fff'],
    'cancelled': ['Cancelled', '#dc3545', '#fff'],
  };
  const [slabel, sbg, scolor] = statusLabels[order.status] || [order.status || '?', '#e0e4ea', '#666'];

  // 取第一个 item 的配送日期（要求完成日期）和订单创建日期
  const deliveryDate = order.items?.[0]?.deliveryDate?.split('T')[0] || '';
  const createdDate = order.createdDate || '';

  // Delivery: on-hold→processing→fulfilled→completed
  // Pickup:   on-hold→processing→readyforpickup→completed
  const isPickup = !order.address;
  const statusFlow = isPickup
    ? {
      'on-hold': ['processing', '▶️', 'Start processing'],
      'processing': ['readyforpickup', '📦', 'Ready for pickup'],
      'readyforpickup': ['completed', '✅', 'Mark completed']
    }
    : {
      'on-hold': ['processing', '▶️', 'Start processing'],
      'processing': ['fulfilled', '🚚', 'Start delivering'],
      'fulfilled': ['completed', '✅', 'Mark completed']
    };
  const flow = statusFlow[order.status];
  const actionBtn = flow
    ? `<button class="today-action-btn" data-action="${flow[0]}" data-oid="${order.id}"
         title="${flow[2]}">${flow[1]}</button>`
    : '';
  // 取消按钮
  const cancelBtn = (order.status === 'on-hold' || order.status === 'processing')
    ? `<button class="today-action-btn" data-action="cancelled" data-oid="${order.id}"
         title="Cancel order" style="background:#dc3545;color:#fff;">✕</button>`
    : '';

  return `
  <div class="today-order">
    <div class="today-order-head">
      <strong>${order.number}</strong>
      ${actionBtn}
      ${cancelBtn}
      <span class="today-status-badge" style="background:${sbg};color:${scolor}">${slabel}</span>
      <span>${order.customer}</span>
      ${createdDate ? `<span class="today-date-badge" style="background:#e8f0fe;color:#1a73e8;" title="Order date">From ${createdDate}</span>` : ''}
      ${deliveryDate ? `<span class="today-date-badge" title="Delivery/Pickup date">To ${deliveryDate}</span>` : ''}
      ${order.phone ? `<span class="today-phone-badge">${order.phone}</span>` : ''}
    </div>
    <div class="today-order-body">
        <div>${items}</div>
        ${deliveryNote}
        ${order.address ? `<div class="today-addr">${order.address}  |  <span style="color:#10b981;font-weight:600;">$${order.total.toFixed(2)}</span></div>`
      : `<div class="today-addr" style="color:#10b981;font-weight:600;">$${order.total.toFixed(2)}</div>`}
        ${note}
    </div>
  </div>
  `;
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/api/order/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Failed to update order status.');
    // 全页刷新（KPI 卡片 + 订单列表 + 图表）
    loadAll();
  } catch (err) {
    console.error('[Order] Update status error:', err);
    showError('Failed to update order status.');
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

async function loadSummary(startDate, endDate) {
  const hasFilter = !!(startDate || endDate);

  // 仅在无筛选时清除日期输入框（首次加载 / 手动 Refresh）
  if (!hasFilter) {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    const filterRow = document.querySelector('.date-filter-row');
    if (filterRow) filterRow.classList.remove('filter-active');
    toggleFilterLabel('All');
  }

  // 构建带日期参数的 URL
  let url = `${API_BASE}/api/analytics/summary`;
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  if (qs) url += '?' + qs;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // KPI 卡片
  document.getElementById('kpi-totalOrders').textContent = data.totalOrders;
  document.getElementById('kpi-totalRevenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
  const avgOrder = data.totalOrders > 0 ? Math.round(data.totalRevenue / data.totalOrders * 100) / 100 : 0;
  document.getElementById('kpi-avgOrderValue').textContent = `$${avgOrder.toFixed(2)}`;
  const deliveryEl = document.getElementById('kpi-deliveryCount');
  if (deliveryEl) deliveryEl.textContent = `${data.deliveryCount} (${data.deliveryRatio}%)`;
  const pickupEl = document.getElementById('kpi-pickupCount');
  if (pickupEl) pickupEl.textContent = `${data.pickupCount} (${data.pickupRatio}%)`;
  document.getElementById('kpi-totalDeliveryFee').textContent = `$${data.totalDeliveryFee?.toFixed(2) || '0.00'}`;
  document.getElementById('kpi-avgDeliveryFee').textContent = `$${data.avgDeliveryFee?.toFixed(2) || '0.00'}`;
  const compEl = document.getElementById('kpi-completed');
  if (compEl) compEl.textContent = data.statusCounts?.['completed'] || 0;
  const areasEl = document.getElementById('kpi-areasToday');
  if (areasEl) areasEl.textContent = data.areasServed || '0';

  // Delivery vs Pickup 饼图
  renderMethodChart(data.deliveryCount, data.pickupCount);

  // 订单状态分布图
  renderStatusChart(data.statusCounts);

  // 月度趋势图（仅在无日期筛选时更新）
  if (!hasFilter) {
    allMonthlyData = data.monthly;
    window.allMonthlyData = data.monthly;
    buildYearTabs(data.monthly);
    renderMonthlyChart(data.monthly, currentYear);
    updateYearSummary(data.monthly, currentYear);
    document.getElementById('yearSummary').style.display = currentYear === 'all' ? 'none' : '';
  }
}

// ---- 日期范围筛选 ----
function applyDateFilter() {
  const startVal = document.getElementById('filterStartDate').value;
  const endVal = document.getElementById('filterEndDate').value;
  const filterRow = document.querySelector('.date-filter-row');

  // 同步 min/max 约束
  document.getElementById('filterEndDate').min = startVal || '';
  document.getElementById('filterStartDate').max = endVal || '';

  // 无筛选 → 恢复全部数据
  if (!startVal && !endVal) {
    if (filterRow) { filterRow.classList.remove('filter-active'); toggleFilterLabel('All'); }
    restoreMonthlyView();
    return;
  }

  if (filterRow) { filterRow.classList.add('filter-active'); toggleFilterLabel(`Filtered ${startVal} ~ ${endVal}`); }
  document.getElementById('btnAllToday').textContent = 'All';

  // 1) 刷新 KPI 卡片和饼图（summary 接口带日期参数）
  loadSummary(startVal, endVal);

  // 2) 刷新 Delivery Areas 和 Products 区块
  loadDeliveryAreas(startVal, endVal);
  loadProducts(startVal, endVal);

  // 3) 请求每日数据渲染日趋势图
  const params = new URLSearchParams();
  if (startVal) params.set('startDate', startVal);
  if (endVal) params.set('endDate', endVal);

  fetch(`${API_BASE}/api/analytics/daily?${params}`)
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      renderDailyChart(data.daily);
      document.getElementById('yearSummary').style.display = 'none';
    })
    .catch(() => restoreMonthlyView());
}

function restoreMonthlyView() {
  document.getElementById('filterStartDate').value = '';
  document.getElementById('filterEndDate').value = '';
  const filterRow = document.querySelector('.date-filter-row');
  if (filterRow) { filterRow.classList.remove('filter-active'); toggleFilterLabel('All'); }
  document.getElementById('btnAllToday').textContent = 'Today';

  // 恢复全部数据：KPI、Delivery Areas、Products
  loadSummary();
  loadDeliveryAreas();
  loadProducts();
}

function toggleFilterLabel(text) {
  const label = document.querySelector('.filter-label');
  if (!label) return;
  label.style.display = text ? '' : 'none';
  if (text) label.textContent = text;
}

function renderDailyChart(daily) {
  const ctx = document.getElementById('chartMonthly').getContext('2d');
  if (chartMonthly) chartMonthly.destroy();
  if (!daily || daily.length === 0) return;

  const step = daily.length > 20 ? 2 : 1;
  const fullDates = daily.map(d => d.date); // YYYY-MM-DD
  const labels = daily.map((d, i) => {
    const [y, m, day] = d.date.split('-');
    const wd = WEEKDAYS[new Date(d.date).getDay()];
    if (daily.length > 14 && i % step !== 0) return `${m}/${day}`;
    return [`${m}/${day}`, wd];
  });

  const revenueOverlay = createRevenueOverlay();

  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Orders', data: daily.map(d => d.orderCount), backgroundColor: '#0d9488', borderRadius: 4 },
        {
          label: 'Revenue ($)', data: daily.map(d => d.revenue), type: 'line', yAxisID: 'y1',
          borderColor: 'transparent', backgroundColor: 'transparent', pointBackgroundColor: 'transparent', pointBorderColor: 'transparent'
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom', labels: {
            padding: 16, usePointStyle: true,
            generateLabels(chart) {
              return [
                { text: 'Orders', fillStyle: '#0d9488', strokeStyle: '#0d9488', lineWidth: 0, hidden: false, index: 0, datasetIndex: 0, pointStyle: 'rect' },
                { text: 'Revenue ($)', fillStyle: '#10b981', strokeStyle: '#10b981', lineWidth: 3, hidden: false, index: 0, datasetIndex: 1, pointStyle: 'circle' },
              ];
            }
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              if (fullDates[idx]) {
                const [y, m, d2] = fullDates[idx].split('-');
                const wd = WEEKDAYS[new Date(fullDates[idx]).getDay()];
                return `${m}/${d2} ${wd}`;
              }
              return '';
            },
            label: (ctx) => ctx.datasetIndex === 1 ? `Revenue: $${(ctx.raw || 0).toFixed(2)}` : `Orders: ${ctx.raw}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, minRotation: 0, maxTicksLimit: 21 },
        },
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Orders' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Revenue ($)' } },
      },
    },
    plugins: [revenueOverlay],
  });
}

// 绑定事件
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filterStartDate').addEventListener('change', function () {
    document.getElementById('filterEndDate').min = this.value;
    applyDateFilter();
  });
  document.getElementById('filterEndDate').addEventListener('change', function () {
    document.getElementById('filterStartDate').max = this.value;
    applyDateFilter();
  });
  document.getElementById('btnThisWeek').addEventListener('click', () => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); // 本周一
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6); // 本周日
    document.getElementById('filterStartDate').value = mon.toISOString().slice(0, 10);
    document.getElementById('filterEndDate').value = sun.toISOString().slice(0, 10);
    document.getElementById('filterStartDate').max = sun.toISOString().slice(0, 10);
    document.getElementById('filterEndDate').min = mon.toISOString().slice(0, 10);
    applyDateFilter();
  });
  document.getElementById('btnThisMonth').addEventListener('click', () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    document.getElementById('filterStartDate').value = first.toISOString().slice(0, 10);
    document.getElementById('filterEndDate').value = last.toISOString().slice(0, 10);
    applyDateFilter();
  });
  document.getElementById('btnAllToday').addEventListener('click', () => {
    const btn = document.getElementById('btnAllToday');
    if (btn.textContent === 'All') {
      // 当前是过滤状态 → 清除过滤，显示全部
      restoreMonthlyView();
    } else {
      // 当前是全部 → 切到今天
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('filterStartDate').value = today;
      document.getElementById('filterEndDate').value = today;
      applyDateFilter();
    }
  });
})

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

    // 清除日期筛选并恢复全部数据
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    const filterRow = document.querySelector('.date-filter-row');
    if (filterRow) { filterRow.classList.remove('filter-active'); toggleFilterLabel('All'); }

    document.getElementById('yearSummary').style.display = currentYear === 'all' ? 'none' : '';
    renderMonthlyChart(allMonthlyData, currentYear);
    updateYearSummary(allMonthlyData, currentYear);
  };
  container.addEventListener('click', yearTabHandler);
}

function updateYearSummary(monthly, yearFilter) {
  if (!monthly || !Array.isArray(monthly)) return;
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
  const maxCount = Math.max(...yearData.map(m => m.orderCount));
  const busiestMonths = yearData.filter(m => m.orderCount === maxCount);
  const busiestLabel = busiestMonths.map(m => {
    const [y, mo] = m.month.split('-');
    return `${MONTHS[parseInt(mo) - 1]} ${y}`;
  }).join(', ');
  const tieHint = busiestMonths.length > 1 ? ` (${busiestMonths.length} tied)` : '';

  document.getElementById('yearSummaryOrders').textContent = totalOrders;
  document.getElementById('yearSummaryRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById('yearSummaryAvg').textContent = `${avgMonthly} / mo`;
  document.getElementById('yearSummaryBusiest').textContent = `${busiestLabel} (${maxCount})${tieHint}`;
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
    return yearFilter === 'all' ? `${MONTHS[parseInt(mo) - 1]} ${y}` : MONTHS[parseInt(mo) - 1];
  });

  // 自定义插件：在柱子之后单独画收益线（确保在上层）
  const revenueOverlay = createRevenueOverlay();

  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: filtered.map(m => m.orderCount),
          backgroundColor: '#0d9488',
          borderRadius: 4,
        },
        {
          label: 'Revenue ($)',
          data: filtered.map(m => m.revenue),
          type: 'line',
          yAxisID: 'y1',
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'transparent',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16, usePointStyle: true, generateLabels(chart) {
              return [
                { text: 'Orders', fillStyle: '#0d9488', strokeStyle: '#0d9488', lineWidth: 0, hidden: false, index: 0, datasetIndex: 0, pointStyle: 'rect' },
                { text: 'Revenue ($)', fillStyle: '#10b981', strokeStyle: '#10b981', lineWidth: 3, hidden: false, index: 0, datasetIndex: 1, pointStyle: 'circle' },
              ];
            }
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.datasetIndex === 1 ? `Revenue: $${(ctx.raw || 0).toFixed(2)}` : `Orders: ${ctx.raw}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Orders' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Revenue ($)' } },
      },
    },
    plugins: [revenueOverlay],
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
        backgroundColor: ['#6366f1', '#d97706'],
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
    'fulfilled': 'Fulfilled',
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
    '#94a3b8', '#3b82f6', '#10b981', '#06b6d4',
    '#ef4444', '#8b5cf6', '#f59e0b', '#dc2626',
    '#ec4899', '#84cc16',
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

async function loadDeliveryAreas(startDate, endDate) {
  let url = `${API_BASE}/api/analytics/delivery-areas`;
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  if (qs) url += '?' + qs;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const areas = data.areas || [];
  window.allAreasData = areas;  // AI 可访问全量区域数据

  document.getElementById('areas-hint').textContent =
    `Total delivery orders: ${data.totalDeliveryOrders} | Areas served: ${areas.length}`;

  // 柱状图
  renderAreasChart(areas);
  renderDeliveryMap(areas);

  // 表格
  const tbody = document.getElementById('areasBody');
  tbody.innerHTML = '';

  if (areas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8899aa;">No delivery data available.</td></tr>';
    return;
  }

  areas.forEach((area, i) => {
    const tr = document.createElement('tr');
    const fee = area.deliveryFee;
    const feeDisplay = fee !== null ? `$${fee.toFixed(2)}` : '<span style="color:#bbb;">—</span>';
    tr.innerHTML = `
      <td class="rank-col">${i + 1}</td>
      <td class="suburb-link" data-suburb="${area.suburb}"><span>${area.suburb || 'Unknown'}</span></td>
      <td class="num" style="font-weight:600;">${area.orderCount}</td>
      <td class="num">$${area.totalRevenue.toFixed(2)}</td>
      <td class="num" style="text-align:right;font-weight:500;">${feeDisplay}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAreasChart(areas) {
  const ctx = document.getElementById('chartAreas').getContext('2d');
  if (chartAreas) chartAreas.destroy();

  // 动态调整高度：每个 suburb 分配 32px
  const wrapper = ctx.canvas.parentElement;
  wrapper.style.height = '560px';

  const labels = areas.map(a => a.suburb || 'Unknown');
  const values = areas.map(a => a.orderCount);

  chartAreas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Orders',
        data: values,
        backgroundColor: COLORS.area,
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
          ticks: { font: { size: 12 } },
        },
      },
    },
  });
}

// ============================================================
//  3. Products — 商品分析
// ============================================================

async function loadProducts(startDate, endDate) {
  let url = `${API_BASE}/api/analytics/products`;
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  if (qs) url += '?' + qs;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const products = data.products || [];
  window.allProductsData = products;  // AI 可访问全量产品数据

  document.getElementById('products-hint').textContent =
    `Total products sold: ${products.length} | Delivery orders: ${data.totalDeliveryOrders} | Pickup orders: ${data.totalPickupOrders}`;

  // 柱状图（Top 15）
  renderProductsChart(products.slice(0, 15));

  // 表格
  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = '';

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#8899aa;">No product data available.</td></tr>';
    return;
  }

  products.forEach((p, i) => {
    const deliveryPct = p.deliveryRatio;
    const category = p.category || '-';
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
    const imgSrc = p.image || '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;display:block;" onerror="this.style.display='none'">`
      : '';
    const tr = document.createElement('tr');
    tr.className = 'prod-row';
    tr.dataset.productId = p.productId;
    tr.innerHTML = `
      <td class="rank-col"><span class="expand-icon">▶</span> ${i + 1}</td>
      <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:#fff;background:${catColor};">${category}</span></td>
      <td style="text-align:center;">${imgHtml}</td>
      <td class="product-name">${p.name}</td>
      <td class="num">${p.totalQty}</td>
      <td class="num">$${p.totalRevenue.toFixed(2)}</td>
      <td class="num">$${p.unitPrice?.toFixed(2) || '—'}</td>
      <td class="num">${p.deliveryQty}</td>
      <td class="num">${p.pickupQty}</td>
      <td>
        <div class="delivery-pct-cell">
          <span class="delivery-pct-bar"><span class="fill" style="width:${deliveryPct}%"></span></span>
          <span class="delivery-pct-value">${deliveryPct}%</span>
        </div>
      </td>
    `;
    tr.addEventListener('click', () => toggleProductDetail(tr, p));
    tbody.appendChild(tr);
  });
}

function toggleProductDetail(tr, product) {
  const expanded = tr.classList.toggle('expanded');
  const icon = tr.querySelector('.expand-icon');
  if (icon) icon.textContent = expanded ? '▼' : '▶';

  // 查找或创建 detail row
  let detailRow = tr.nextElementSibling;
  if (detailRow && detailRow.classList.contains('prod-detail-row')) {
    detailRow.style.display = expanded ? '' : 'none';
    return;
  }

  if (!expanded) return;

  // 创建 detail row
  detailRow = document.createElement('tr');
  detailRow.className = 'prod-detail-row';
  const td = document.createElement('td');
  td.colSpan = 10;
  td.style.padding = '0';

  const suburbs = product.topSuburbs || [];
  if (suburbs.length === 0) {
    td.innerHTML = '<div style="padding:12px 20px;color:#8899aa;font-size:12px;">No delivery data for this product.</div>';
  } else {
    const maxQty = suburbs[0].qty || 1;
    td.innerHTML = `
      <div style="padding:10px 20px 14px 40px;background:#fafbfc;">
        <div style="font-size:12px;font-weight:600;color:#1a1a2e;margin-bottom:8px;">Top Delivery Suburbs</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${suburbs.map(s => `
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;">
              <span style="width:100px;font-weight:500;color:#1a1a2e;">${s.suburb}</span>
              <span style="flex:1;height:14px;border-radius:3px;background:#e8ecf0;overflow:hidden;">
                <span style="display:block;height:100%;width:${(s.qty / maxQty) * 100}%;border-radius:3px;background:linear-gradient(90deg,#0d9488,#14b8a6);"></span>
              </span>
              <span style="font-weight:600;color:#0d9488;min-width:20px;text-align:right;">×${s.qty}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  detailRow.appendChild(td);
  tr.parentNode.insertBefore(detailRow, tr.nextSibling);
}

function renderProductsChart(products) {
  const ctx = document.getElementById('chartProducts').getContext('2d');
  if (chartProducts) chartProducts.destroy();

  // 预加载图片
  const imagePromises = products.map(p => {
    if (!p.image) return Promise.resolve(null);
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = p.image;
    });
  });

  Promise.all(imagePromises).then(images => {
    if (chartProducts) chartProducts.destroy();

    const labels = products.map(p =>
      p.name.length > 30 ? p.name.slice(0, 28) + '...' : p.name
    );

    // 自定义插件：在 x 轴标签底部绘制商品缩略图
    const imagePlugin = {
      id: 'productChartImages',
      afterDraw(chart) {
        const { ctx, scales, chartArea: ca } = chart;
        const xScale = scales.x;
        const imgSize = 81; // 图片大小
        const gap = 36; // 跳过标签高度(约15px) + 间隔
        images.forEach((img, i) => {
          if (!img) return;
          const x = xScale.getPixelForValue(i);
          const ix = x - imgSize / 2;
          const iy = ca.bottom + gap;
          ctx.save();
          const r = 4;
          ctx.beginPath();
          ctx.moveTo(ix + r, iy);
          ctx.lineTo(ix + imgSize - r, iy);
          ctx.quadraticCurveTo(ix + imgSize, iy, ix + imgSize, iy + r);
          ctx.lineTo(ix + imgSize, iy + imgSize - r);
          ctx.quadraticCurveTo(ix + imgSize, iy + imgSize, ix + imgSize - r, iy + imgSize);
          ctx.lineTo(ix + r, iy + imgSize);
          ctx.quadraticCurveTo(ix, iy + imgSize, ix, iy + imgSize - r);
          ctx.lineTo(ix, iy + r);
          ctx.quadraticCurveTo(ix, iy, ix + r, iy);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, ix, iy, imgSize, imgSize);
          ctx.restore();
        });
      },
    };

    chartProducts = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Delivery',
            data: products.map(p => p.deliveryQty),
            backgroundColor: COLORS.product,
            borderRadius: 4,
          },
          {
            label: 'Pickup',
            data: products.map(p => p.pickupQty),
            backgroundColor: COLORS.pickup,
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
            ticks: { font: { size: 11 }, maxRotation: 0, minRotation: 0 },
            afterFit(scale) {
              scale.height += 90;
            },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
      plugins: [imagePlugin],
    });
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

async function loadAreaDetail(suburb) {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/delivery-area/${encodeURIComponent(suburb)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // KPI
    document.getElementById('ad-orders').textContent = data.orderCount;
    document.getElementById('ad-revenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
    document.getElementById('ad-customers').textContent = data.uniqueCustomers;
    const avgVal = data.orderCount > 0 ? Math.round(data.totalRevenue / data.orderCount * 100) / 100 : 0;
    document.getElementById('ad-avgOrderValue').textContent = `$${avgVal.toFixed(2)}`;
    const topProdEl = document.getElementById('ad-topProduct');
    const topProdImg = document.getElementById('ad-topProductImg');
    if (data.topProducts && data.topProducts.length > 0) {
      const maxQty = data.topProducts[0].qty;
      const topList = data.topProducts.filter(p => p.qty === maxQty);
      const names = topList.map(p => p.name);
      topProdEl.textContent = names.length <= 2
        ? names.join(' & ')
        : names.slice(0, 2).join(', ') + ` & ${names.length - 2} more`;
      // 显示第一个商品的图片
      if (topList[0]?.image) {
        topProdImg.src = topList[0].image;
        topProdImg.style.display = 'block';
      } else {
        topProdImg.style.display = 'none';
      }
    } else {
      topProdEl.textContent = '—';
      topProdImg.style.display = 'none';
    }
    document.getElementById('area-detail-hint').textContent = `${data.orderCount} orders, ${data.uniqueCustomers} unique customers`;

    // Busiest Month
    if (data.monthlyTrend && data.monthlyTrend.length > 0) {
      const maxCount = Math.max(...data.monthlyTrend.map(m => m.orderCount));
      const busiestMonths = data.monthlyTrend.filter(m => m.orderCount === maxCount);
      const label = busiestMonths.map(m => {
        const [y, mo] = m.month.split('-');
        return `${MONTHS[parseInt(mo) - 1]} ${y}`;
      }).join(', ');
      const tieHint = busiestMonths.length > 1 ? ` (${busiestMonths.length} tied)` : '';
      document.getElementById('ad-busiestMonth').textContent = `${label} (${maxCount})${tieHint}`;
    } else {
      document.getElementById('ad-busiestMonth').textContent = '—';
    }

    // Delivery Fee
    const fee = data.deliveryFee;
    if (fee !== null && fee !== undefined) {
      document.getElementById('ad-areaDeliveryFee').textContent = `$${fee.toFixed(2)}`;
      document.getElementById('ad-totalDeliveryFee').textContent = `$${(fee * data.orderCount).toFixed(2)}`;
    } else {
      document.getElementById('ad-areaDeliveryFee').textContent = '—';
      document.getElementById('ad-totalDeliveryFee').textContent = '—';
    }

    // Monthly trend chart
    renderAreaTrend(data.monthlyTrend);

    // Top products
    renderAreaTopProducts(data.topProducts);
  } catch (err) {
    console.error('[Area Detail] Load error:', err);
    document.getElementById('area-detail-hint').textContent = 'Failed to load area details.';
    document.getElementById('ad-orders').textContent = '—';
    document.getElementById('ad-revenue').textContent = '—';
    document.getElementById('ad-customers').textContent = '—';
    document.getElementById('ad-busiestMonth').textContent = '—';
    document.getElementById('ad-topProduct').textContent = '—';
    document.getElementById('ad-areaDeliveryFee').textContent = '—';
    document.getElementById('ad-totalDeliveryFee').textContent = '—';
  }
}

function renderAreaTrend(monthlyTrend) {
  const ctx = document.getElementById('chartAreaDetail').getContext('2d');
  if (chartAreaDetail) chartAreaDetail.destroy();

  if (!monthlyTrend || monthlyTrend.length === 0) return;

  const labels = monthlyTrend.map(m => m.month);
  const monthsAbbr = labels.map(m => {
    const [y, mo] = m.split('-');
    return `${MONTHS[parseInt(mo) - 1]} ${y}`;
  });

  // 自定义插件：收益线画在柱子之上
  const revenueOverlay = createRevenueOverlay();

  chartAreaDetail = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthsAbbr,
      datasets: [
        { label: 'Orders', data: monthlyTrend.map(m => m.orderCount), backgroundColor: '#0d9488', borderRadius: 4 },
        {
          label: 'Revenue ($)', data: monthlyTrend.map(m => m.revenue), type: 'line', yAxisID: 'y1',
          borderColor: 'transparent', backgroundColor: 'transparent', pointBackgroundColor: 'transparent', pointBorderColor: 'transparent'
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom', labels: {
            padding: 12, usePointStyle: true,
            generateLabels(chart) {
              return [
                { text: 'Orders', fillStyle: '#0d9488', strokeStyle: '#0d9488', lineWidth: 0, hidden: false, index: 0, datasetIndex: 0, pointStyle: 'rect' },
                { text: 'Revenue ($)', fillStyle: '#10b981', strokeStyle: '#10b981', lineWidth: 3, hidden: false, index: 0, datasetIndex: 1, pointStyle: 'circle' },
              ];
            }
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.datasetIndex === 1 ? `Revenue: $${(ctx.raw || 0).toFixed(2)}` : `Orders: ${ctx.raw}`,
          },
        },
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Orders' } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Revenue ($)' } },
      },
    },
    plugins: [revenueOverlay],
  });
}

function renderAreaTopProducts(topProducts) {
  const container = document.getElementById('areaTopProductsList');
  if (!container) return;

  if (!topProducts || topProducts.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#8899aa;padding:40px 0;">No product data.</div>';
    return;
  }

  const sliced = topProducts.slice(0, 10);
  const maxQty = sliced[0]?.qty || 1;

  container.innerHTML = sliced.map((p, i) => {
    const barW = Math.round((p.qty / maxQty) * 100);
    const imgHtml = p.image
      ? `<img src="${p.image}" class="top-prod-img" onerror="this.style.display='none'">`
      : `<div class="top-prod-img-placeholder">${i + 1}</div>`;
    return `<div class="top-prod-row">
      ${imgHtml}
      <div class="top-prod-info">
        <div class="top-prod-name">${p.name}</div>
        <div class="top-prod-bar-wrap"><span class="top-prod-bar" style="width:${barW}%"></span></div>
      </div>
      <div class="top-prod-qty">×${p.qty}</div>
    </div>`;
  }).join('');
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
    const feeText = area.deliveryFee !== null ? `$${area.deliveryFee.toFixed(2)}` : 'N/A';
    circle.bindTooltip(
      `<strong>${area.suburb}</strong><br>Orders: ${area.orderCount}<br>Revenue: $${area.totalRevenue}<br>Delivery Fee: ${feeText}`,
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

// ---- AI 分析 ----

async function requestAiAnalysis(question) {
  const startVal = document.getElementById('filterStartDate').value;
  const endVal = document.getElementById('filterEndDate').value;
  const dateRange = (startVal && endVal) ? `${startVal || '...'} ~ ${endVal || '...'}` : 'All';

  // 1) 收集Overview数据（从实际渲染的订单卡片计数）
  const delCards = document.querySelectorAll('#todayDeliveryList .today-order');
  const pickCards = document.querySelectorAll('#todayPickupList .today-order');
  const deliveryCount = delCards.length;
  const pickupCount = pickCards.length;
  const totalFromCards = deliveryCount + pickupCount + (document.querySelectorAll('#todayCompletedList .today-order').length || 0);

  const overview = {
    totalOrders: parseInt(document.getElementById('kpi-totalOrders').textContent) || totalFromCards || 0,
    totalRevenue: parseFloat(document.getElementById('kpi-totalRevenue').textContent.replace('$', '')) || 0,
    avgOrderValue: parseFloat(document.getElementById('kpi-avgOrderValue').textContent.replace('$', '')) || 0,
    deliveryCount,
    pickupCount,
    deliveryRatio: totalFromCards > 0 ? Math.round((deliveryCount / totalFromCards) * 100) : 0,
    pickupRatio: totalFromCards > 0 ? Math.round((pickupCount / totalFromCards) * 100) : 0,
    totalDeliveryFee: parseFloat(document.getElementById('kpi-totalDeliveryFee').textContent.replace('$', '')) || 0,
  };

  // 2) 收集 topProducts（从全局全量数据）
  const topProducts = (window.allProductsData || []).slice(0, 5).map(p => ({
    name: p.name, totalQty: p.totalQty, totalRevenue: p.totalRevenue, deliveryRatio: p.deliveryRatio
  }));

  // 3) 收集 topAreas（从全局全量数据）
  const topAreas = (window.allAreasData || []).slice(0, 5).map(a => ({
    suburb: a.suburb, orderCount: a.orderCount, totalRevenue: a.totalRevenue
  }));

  // 3.5) 构建月度趋势摘要（从已缓存的月度数据）
  let monthlyTrend = '';
  const monthly = window.allMonthlyData;
  if (monthly && monthly.length > 0) {
    const lines = monthly.map(m => {
      const [y, mo] = m.month.split('-');
      const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(mo) - 1];
      return `${mon} ${y}: ${m.orderCount} orders, $${m.revenue.toFixed(2)} revenue`;
    });
    monthlyTrend = lines.join('\n');
  }
  console.log('[AI Frontend] monthlyTrend chars:', monthlyTrend.length, 'monthly data entries:', monthly?.length);

  // 4) 调用AI
  const res = await fetch(`${API_BASE}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overview, topProducts, topAreas, monthlyTrend, dateRange, question,
      model: document.getElementById('aiModelSelect')?.value || '' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI 分析请求失败');
  }

  return (await res.json()).analysis;
}

/**
 * 切换 AI 聊天窗开/关
 */
function toggleAiChat() {
  const popup = document.getElementById('aiChatPopup');
  const isOpen = popup.classList.toggle('open');

  if (isOpen) {
    document.getElementById('aiChatInput').focus();
    // 重置欢迎界面（如果之前清空了）
    const body = document.getElementById('aiChatBody');
    if (!body.querySelector('.ai-chat-welcome') && !body.querySelector('.ai-chat-msg')) {
      resetChatWelcome();
    }
  }
}

/**
 * 重置聊天窗为欢迎界面
 */
function resetChatWelcome() {
  document.getElementById('aiChatBody').innerHTML = `
    <div class="ai-chat-welcome">
      <div class="ai-chat-avatar">🤖</div>
      <p>Hello! I'm your data analyst. I can help you understand your sales data.</p>
      <p class="ai-chat-hint">Try asking:</p>
      <div class="ai-quick-options" id="aiQuickOptions">
        <button class="ai-quick-btn" data-question="How many orders do I need to deal with today?">📋 Today\'s orders</button>
        <button class="ai-quick-btn" data-question="Which orders today have special notes or urgent requests?">⚠️ Urgent notes</button>
        <button class="ai-quick-btn" data-question="Where do I need to deliver flowers today? List all addresses.">📍 Today\'s route</button>
        <button class="ai-quick-btn" data-question="What\'s the most efficient delivery plan for today based on the addresses?">🗺️ Plan route</button>
      </div>
    </div>
  `;

  // 绑定快捷选项事件
  document.getElementById('aiQuickOptions').addEventListener('click', (e) => {
    const btn = e.target.closest('.ai-quick-btn');
    if (!btn) return;
    const question = btn.dataset.question;
    document.getElementById('aiChatInput').value = question;
    sendAiMessage();
  });
}

/**
 * 发送消息（流式输出版本）
 */
async function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiChatSend');
  const body = document.getElementById('aiChatBody');
  const question = input.value.trim();

  if (!question) return;

  // 禁用输入
  input.disabled = true;
  sendBtn.disabled = true;
  input.value = '';

  // 移除欢迎界面
  const welcome = body.querySelector('.ai-chat-welcome');
  if (welcome) welcome.remove();

  // 移除旧的追问选项
  removeFollowUpOptions();

  // 添加用户消息气泡
  appendChatMsg('user', question);

  // 创建空的 bot 消息气泡
  const botMsg = document.createElement('div');
  botMsg.className = 'ai-chat-msg bot';
  botMsg.textContent = '';
  body.appendChild(botMsg);

  // 添加思考指示器（在 bot 气泡中）
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'ai-chat-thinking';
  thinkingEl.innerHTML = 'Thinking<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  body.appendChild(thinkingEl);
  body.scrollTop = body.scrollHeight;

  try {
    // 构建请求体
    const startVal = document.getElementById('filterStartDate').value;
    const endVal = document.getElementById('filterEndDate').value;
    const dateRange = (startVal && endVal) ? `${startVal || '...'} ~ ${endVal || '...'}` : 'All';

    const deliveryEl = document.getElementById('kpi-deliveryCount');
    const pickupEl = document.getElementById('kpi-pickupCount');
    // 从实际渲染的订单卡片获取准确计数
    const delCards = document.querySelectorAll('#todayDeliveryList .today-order');
    const pickCards = document.querySelectorAll('#todayPickupList .today-order');
    const deliveryCount = delCards.length || parseInt(deliveryEl?.textContent) || 0;
    const pickupCount = pickCards.length || parseInt(pickupEl?.textContent) || 0;
    const totalOrders = deliveryCount + pickupCount + (document.querySelectorAll('#todayCompletedList .today-order').length || 0);

    const overview = {
      totalOrders: parseInt(document.getElementById('kpi-totalOrders').textContent) || totalOrders || 0,
      totalRevenue: parseFloat(document.getElementById('kpi-totalRevenue').textContent.replace('$', '')) || 0,
      avgOrderValue: parseFloat(document.getElementById('kpi-avgOrderValue').textContent.replace('$', '')) || 0,
      deliveryCount,
      pickupCount,
      deliveryRatio: totalOrders > 0 ? Math.round((deliveryCount / totalOrders) * 100) : 0,
      pickupRatio: totalOrders > 0 ? Math.round((pickupCount / totalOrders) * 100) : 0,
      totalDeliveryFee: parseFloat(document.getElementById('kpi-totalDeliveryFee').textContent.replace('$', '')) || 0,
    };

    const topProducts = (window.allProductsData || []).slice(0, 5).map(p => ({
      name: p.name, totalQty: p.totalQty, totalRevenue: p.totalRevenue, deliveryRatio: p.deliveryRatio
    }));

    const topAreas = (window.allAreasData || []).slice(0, 5).map(a => ({
      suburb: a.suburb, orderCount: a.orderCount, totalRevenue: a.totalRevenue
    }));

    let monthlyTrend = '';
    const monthly = window.allMonthlyData;
    if (monthly && monthly.length > 0) {
      monthlyTrend = monthly.map(m => {
        const [y, mo] = m.month.split('-');
        const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(mo) - 1];
        return `${mon} ${y}: ${m.orderCount} orders, $${m.revenue.toFixed(2)} revenue`;
      }).join('\n');
    }

    // 收集今日订单摘要
    let todaySummary = '';
    const allOrderCards = document.querySelectorAll('#todayDeliveryList .today-order, #todayPickupList .today-order, #todayCompletedList .today-order');
    if (allOrderCards.length > 0) {
      const delCards = document.querySelectorAll('#todayDeliveryList .today-order');
      const pickCards = document.querySelectorAll('#todayPickupList .today-order');
      const compCards = document.querySelectorAll('#todayCompletedList .today-order');
      todaySummary = `Today's orders: ${delCards.length} to deliver, ${pickCards.length} ready for pickup, ${compCards.length} completed.\n\n`;
      allOrderCards.forEach(el => {
        const head = el.querySelector('.today-order-head')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const body = el.querySelector('.today-order-body')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        // 提取地址（从 body 中匹配 "地址 | $金额" 格式）
        const addrMatch = body.match(/(.+?)\s*\|\s*\$[\d.]+/);
        const address = addrMatch ? addrMatch[1].trim() : '';
        const notesMatch = body.match(/📋\s*(.+)/);
        const notes = notesMatch ? notesMatch[1] : '';
        if (head) {
          todaySummary += `- ${head}`;
          if (address) todaySummary += ` | 🏠 ${address}`;
          if (notes) todaySummary += ` | 📋 ${notes}`;
          todaySummary += '\n';
        }
      });
    }

    // SSE streaming fetch
    const res = await fetch(`${API_BASE}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overview, topProducts, topAreas, monthlyTrend, todaySummary, dateRange, question, 
        model: document.getElementById('aiModelSelect')?.value || '' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'AI 分析请求失败');
    }

    // 移除思考指示器，开始填充 bot 气泡
    thinkingEl.remove();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content) {
            fullText += parsed.content;
            // 实时渲染 Markdown
            if (typeof marked !== 'undefined' && marked.parse) {
              // 避免 ~$xxx 被误解析为删除线
              botMsg.innerHTML = marked.parse(fullText.replace(/~(\$[\d,.]+)/g, '≈$1'));
            } else {
              botMsg.textContent = fullText;
            }
            body.scrollTop = body.scrollHeight;
          }
        } catch (e) {
          // 跳过解析失败的行
        }
      }
    }

    // 添加追问选项
    appendFollowUpOptions();
  } catch (err) {
    console.error('[AI] Stream error:', err);
    thinkingEl.remove();
    const errEl = document.createElement('div');
    errEl.className = 'ai-chat-error';
    errEl.textContent = err.message || 'Analysis failed. Please try again.';
    body.appendChild(errEl);
    body.scrollTop = body.scrollHeight;
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

/**
 * 在聊天区添加消息气泡
 * @param {'user'|'bot'} role
 * @param {string} content - 纯文本或 Markdown
 */
function appendChatMsg(role, content) {
  const body = document.getElementById('aiChatBody');
  const msg = document.createElement('div');
  msg.className = `ai-chat-msg ${role}`;

  if (role === 'bot') {
    // Markdown 渲染
    if (typeof marked !== 'undefined' && marked.parse) {
      msg.innerHTML = marked.parse(content.replace(/~(\$[\d,.]+)/g, '≈$1'));
    } else {
      msg.textContent = content;
    }
  } else {
    msg.textContent = content;
  }

  body.appendChild(msg);
  body.scrollTop = body.scrollHeight;
}

/**
 * 移除聊天区中旧的追问选项
 */
function removeFollowUpOptions() {
  const body = document.getElementById('aiChatBody');
  const existing = body.querySelectorAll('.ai-followup-row');
  existing.forEach(el => el.remove());
}

/**
 * 在最后一条 AI 回复下方添加追问快捷选项
 */
function appendFollowUpOptions() {
  removeFollowUpOptions();

  const body = document.getElementById('aiChatBody');
  const row = document.createElement('div');
  row.className = 'ai-followup-row';

  const options = [
    { label: '🖊 Orders with notes?', q: 'Which upcoming orders have special instructions or delivery notes I should pay attention to?' },
    { label: '🗺️ Best delivery route?', q: 'Based on today\'s delivery addresses, what is the most efficient route?' },
    { label: '📦 Pickups ready?', q: 'What pickup orders are ready today and what do I need to prepare?' },
    { label: '📊 Today vs average?', q: 'How does today\'s order volume compare to the daily average?' },
  ];

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'ai-followup-btn';
    btn.textContent = opt.label;
    btn.dataset.question = opt.q;
    btn.addEventListener('click', () => {
      document.getElementById('aiChatInput').value = opt.q;
      sendAiMessage();
    });
    row.appendChild(btn);
  });

  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
}

// 初始化快捷选项事件绑定
document.addEventListener('DOMContentLoaded', () => {
  const quickOpts = document.getElementById('aiQuickOptions');
  if (quickOpts) {
    quickOpts.addEventListener('click', (e) => {
      const btn = e.target.closest('.ai-quick-btn');
      if (!btn) return;
      const question = btn.dataset.question;
      document.getElementById('aiChatInput').value = question;
      sendAiMessage();
    });
  }
});

// 初始化聊天窗拖拽调整大小
document.addEventListener('DOMContentLoaded', () => {
  const resizeHandle = document.getElementById('aiChatResize');
  const popup = document.getElementById('aiChatPopup');
  if (!resizeHandle || !popup) return;

  let startX, startY, startW, startH;

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startW = popup.offsetWidth;
    startH = popup.offsetHeight;

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.userSelect = 'none';
  });

  function onResize(e) {
    const dx = startX - e.clientX;  // 向左拖 → 变宽
    const dy = startY - e.clientY;  // 向上拖 → 变高
    const newW = Math.min(900, Math.max(320, startW + dx));
    const newH = Math.min(window.innerHeight * 0.85, Math.max(400, startH + dy));
    popup.style.width = newW + 'px';
    popup.style.maxHeight = 'none';
    popup.style.height = newH + 'px';
  }

  function stopResize() {
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.userSelect = '';
  }
});