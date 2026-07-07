/**
 * 商品数据 API 模块
 *
 * 设计说明：
 * - 双 API 降级策略：优先 WooCommerce REST API（含价格、促销价等电商数据），
 *   不可用时自动回退到 WordPress REST API（仅有基本内容，price 为 null）
 * - mapProduct / mapProductWP 将不同来源的原始数据映射为统一格式，
 *   上层组件只需处理一套数据结构，无需关心数据来源
 * - image 字段兜底逻辑：优先取 images[0].src → 从 HTML 描述中正则提取 → null
 * - fuzzyMatch 逐字符匹配，用于搜索 API 无结果时的本地模糊搜索
 * - 所有导出函数内部都做了 try/catch 降级，调用方不需要额外处理错误
 */

import api from './api';
import { safeFetch } from '../utils/http';

const WP_API = `${process.env.REACT_APP_WC_URL}/wp-json/wp/v2`;

// 将花名转为 URL 友好的 slug（如 "Baby's Breath" → "babys-breath"）
export function toNameSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/['']/g, '')       // 移除撇号
    .replace(/[^a-z0-9]+/g, '-') // 非字母数字替换为连字符
    .replace(/^-+|-+$/g, '');    // 去掉首尾连字符
}

// WooCommerce API 数据映射（含完整价格信息）
function mapProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    nameSlug: toNameSlug(product.name),
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    stock_status: product.stock_status || 'instock',
    date_created: product.date_created || null,
    image: product.images?.[0]?.src || extractImage(product.description) || null,
  };
}

// WordPress API 数据映射（无价格数据，price 为 null）
function mapProductWP(product) {
  return {
    id: product.id,
    name: product.title.rendered,
    slug: product.slug,
    nameSlug: toNameSlug(product.title.rendered),
    price: null,
    regular_price: null,
    sale_price: null,
    stock_status: 'instock',
    date_created: product.date || null,
    image: extractImage(product.content.rendered),
  };
}

// 逐字符模糊匹配（如 "ros" 可匹配 "Roses"）
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < query.length; i++) {
    if (t[i] === query[qi]) qi++;
  }
  return qi === query.length;
}


// 安全调用 WooCommerce API，失败时返回 null（触发降级到 WordPress API）
async function safeApiGet(endpoint) {
  try {
    const res = await api.get(endpoint);
    return res.data;
  } catch {
    return null;
  }
}

async function fetchAllForFuzzy(limit = 100) {
  let data = await safeApiGet(`products?per_page=${limit}&orderby=title&order=asc`);
  if (data) return data.map(mapProduct);
  data = await safeFetch(`${WP_API}/product?per_page=${limit}`);
  return data.map(mapProductWP);
}

/**
 * 搜索商品（三层降级策略）
 * 1. 先用 WooCommerce API 搜索 + 本地模糊过滤
 * 2. 若失败或无匹配，用 WordPress API 搜索 + 模糊过滤
 * 3. 若仍无匹配，拉取全部商品做本地模糊匹配（兜底）
 */
export async function searchProducts(query) {
  const lower = query.toLowerCase();
  // 第1层：WooCommerce API（含价格数据，结果更丰富）
  const wcData = await safeApiGet(`products?search=${encodeURIComponent(query)}&per_page=50&orderby=price&order=asc`);
  if (wcData) {
    const matched = wcData.filter((p) => fuzzyMatch(p.name, lower));
    if (matched.length > 0) return matched.map(mapProduct);
  }
  // 第2层：WordPress API
  const wpData = await safeFetch(`${WP_API}/product?search=${encodeURIComponent(query)}&per_page=50`);
  const matchedWP = wpData.filter((p) => fuzzyMatch(p.title?.rendered, lower));
  if (matchedWP.length > 0) return matchedWP.map(mapProductWP);
  // 第3层：拉取全部商品本地模糊匹配
  const all = await fetchAllForFuzzy(100);
  return all.filter((p) => fuzzyMatch(p.name, lower));
}

export async function fetchAllProducts(limit) {
  let data = await safeApiGet(`products?per_page=${limit}&orderby=date&order=asc`);
  if (data) return data.map(mapProduct);
  data = await safeFetch(`${WP_API}/product?per_page=${limit}`);
  return data.map(mapProductWP);
}

export async function fetchProductsByCategory(categorySlug) {
  const catData = await safeFetch(`${WP_API}/product_cat?slug=${categorySlug}`);
  if (catData.length === 0) return [];
  const categoryId = catData[0].id;
  let data = await safeApiGet(`products?category=${categoryId}`);
  if (data) return data.map(mapProduct);
  data = await safeFetch(`${WP_API}/product?product_cat=${categoryId}`);
  return data.map(mapProductWP);
}

// 商品详情数据映射（比 mapProduct 多包含 description 和 short_description）
function formatProductDetail(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    nameSlug: toNameSlug(p.name),
    price: p.price,
    regular_price: p.regular_price,
    sale_price: p.sale_price,
    description: p.description,
    short_description: p.short_description,
    image: p.images?.[0]?.src || extractImage(p.description) || null,
    gallery: p.images?.map((img) => img.src) || [],
  };
}

// WordPress API 商品详情映射（无价格，但含完整描述）
function formatProductDetailWP(p) {
  return {
    id: p.id,
    name: p.title.rendered,
    slug: p.slug,
    nameSlug: toNameSlug(p.title.rendered),
    price: null,
    regular_price: null,
    sale_price: null,
    description: p.content.rendered,
    short_description: p.excerpt.rendered,
    image: extractImage(p.content.rendered),
    gallery: [],
  };
}

/**
 * 根据 slug 获取单个商品详情
 * 按优先级查：WooCommerce slug → WordPress slug → nameSlug 再查 WooCommerce
 * 三级兜底，确保即使用户从不同入口进入都能找到商品
 */
export async function fetchProductBySlug(slug) {
  // 1. 直接用 slug 查询 API（兼容原始 slug "flower-1" 格式）
  let data = await safeApiGet(`products?slug=${slug}`);
  if (data && data.length > 0) return formatProductDetail(data[0]);

  let wpData = await safeFetch(`${WP_API}/product?slug=${slug}`);
  if (wpData.length > 0) return formatProductDetailWP(wpData[0]);

  // 2. 没找到 → 可能是花名 slug，拉取全量商品按名称匹配
  data = await safeApiGet(`products?per_page=100&orderby=title&order=asc`);
  if (data) {
    const match = data.find((p) => toNameSlug(p.name) === slug);
    if (match) return formatProductDetail(match);
  }

  wpData = await safeFetch(`${WP_API}/product?per_page=100`);
  if (wpData.length > 0) {
    const match = wpData.find((p) => toNameSlug(p.title?.rendered) === slug);
    if (match) return formatProductDetailWP(match);
  }

  return null;
}

function extractImage(html) {
  const match = html.match(/src="([^"]+)"/);
  return match ? match[1] : null;
}
