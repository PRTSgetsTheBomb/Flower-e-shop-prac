/**
 * 配送区域数据
 *
 * 包含 11 个 Melbourne 郊区及其坐标。
 * 提供两种查找方式：
 *   1. getShippingBySuburb() — 同步查询预置列表（即时响应）
 *   2. lookupAnySuburb()    — 异步兜底：硬编码 → localStorage 缓存 → Nominatim API
 */

// ---- 店铺坐标（Oakleigh South） ----
const SHOP_LAT = -37.933;
const SHOP_LNG = 145.091;

// ---- 配送区域及其坐标 ----
const areas = [
  { name: 'Melbourne CBD',  lat: -37.8136, lng: 144.9631 },
  { name: 'Armadale',       lat: -37.8550, lng: 145.0167 },
  { name: 'Bentleigh',      lat: -37.9181, lng: 145.0356 },
  { name: 'Camberwell',     lat: -37.8322, lng: 145.0694 },
  { name: 'Malvern',        lat: -37.8583, lng: 145.0250 },
  { name: 'Richmond',       lat: -37.8231, lng: 145.0019 },
  { name: 'St Kilda',       lat: -37.8676, lng: 144.9800 },
  { name: 'South Yarra',    lat: -37.8383, lng: 144.9917 },
  { name: 'Windsor',        lat: -37.8517, lng: 144.9917 },
  { name: 'Southbank',      lat: -37.8200, lng: 144.9600 },
  { name: 'Port Melbourne', lat: -37.8267, lng: 144.9400 },
];

// ---- Haversine 公式：两点间的球面距离（km） ----
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- 距离 → 运费映射 ----
function distanceToFee(distKm) {
  if (distKm <= 3)  return 10;
  if (distKm <= 8)  return 15;
  if (distKm <= 15) return 20;
  return null; // 超出配送范围
}

/**
 * 同步查询预置郊区列表（已知的 11 个）
 * @param {string} suburbName
 * @returns {{ fee: number|null, distance: number|null }}
 */
export function getShippingBySuburb(suburbName) {
  const area = areas.find((a) => a.name === suburbName);
  if (!area) return { fee: null, distance: null };
  const dist = haversineKm(SHOP_LAT, SHOP_LNG, area.lat, area.lng);
  return {
    distance: Math.round(dist * 10) / 10,
    fee: distanceToFee(dist),
  };
}

/**
 * 获取距离和运费文本（用于 UI 展示）
 */
export function getShippingText(suburbName) {
  const { distance, fee } = getShippingBySuburb(suburbName);
  if (fee === null) return { distance, text: 'Not available' };
  return { distance, text: `$${fee.toFixed(2)}` };
}

// ============================================================
//  异步兜底：任意 suburb → Nominatim API
// ============================================================

const NOMINATIM_CACHE_KEY = 'nominatim_cache';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(NOMINATIM_CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(NOMINATIM_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota exceeded */ }
}

/**
 * 查找任意郊区的坐标
 * 优先级：预置列表 → localStorage 缓存 → Nominatim API
 * @param {string} suburbName  如 "Caulfield"、"Elwood"
 * @returns {Promise<{lat:number, lng:number}|null>}
 */
export async function lookupSuburbCoords(suburbName) {
  const key = suburbName.toLowerCase().trim();
  if (!key) return null;

  // 1. 预置列表
  const known = areas.find((a) => a.name.toLowerCase() === key);
  if (known) return { lat: known.lat, lng: known.lng };

  // 2. localStorage 缓存
  const cache = loadCache();
  if (cache[key]) return cache[key];

  // 3. Nominatim 免费逆地理编码 API
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(suburbName + ', VIC, Australia')}&limit=1`,
      { headers: { 'User-Agent': 'PiscesFlower/1.0' } }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    // 写缓存
    cache[key] = coords;
    saveCache(cache);
    return coords;
  } catch {
    return null;
  }
}

/**
 * 异步计算任意郊区的运费。已知 suburb 即时返回，未知 suburb 通过 API 查询。
 * @param {string} suburbName
 * @returns {Promise<{fee: number|null, distance: number|null, known: boolean}>}
 *   known —— true: 预置郊区 / false: API 查到的 / null: 查不到
 */
export async function getShippingBySuburbAsync(suburbName) {
  if (!suburbName) return { fee: null, distance: null, known: false };

  // 先试同步（预置列表）
  const sync = getShippingBySuburb(suburbName);
  if (sync.fee !== null || sync.distance !== null) {
    return { ...sync, known: true };
  }

  // 异步兜底
  const coords = await lookupSuburbCoords(suburbName);
  if (!coords) return { fee: null, distance: null, known: false };

  const dist = haversineKm(SHOP_LAT, SHOP_LNG, coords.lat, coords.lng);
  return {
    distance: Math.round(dist * 10) / 10,
    fee: distanceToFee(dist),
    known: false,
  };
}

export default areas;