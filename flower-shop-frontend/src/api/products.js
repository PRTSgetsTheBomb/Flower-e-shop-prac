import api from './api';

const WP_API = `${process.env.REACT_APP_WC_URL}/wp-json/wp/v2`;

export async function fetchAllProducts(limit) {
  try {
    const res = await api.get(`products?per_page=${limit}&orderby=date&order=asc`);
    return res.data.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      image: product.images?.[0]?.src || extractImage(product.description) || null,
    }));
  } catch {
    const res = await fetch(`${WP_API}/product?per_page=${limit}`);
    const products = await res.json();
    return products.map((product) => ({
      id: product.id,
      name: product.title.rendered,
      slug: product.slug,
      price: null,
      regular_price: null,
      sale_price: null,
      image: extractImage(product.content.rendered),
    }));
  }
}

export async function fetchProductsByCategory(categorySlug) {
  // 先根据 slug 获取分类 ID
  const catRes = await fetch(`${WP_API}/product_cat?slug=${categorySlug}`);
  const catData = await catRes.json();
  if (catData.length === 0) return [];

  const categoryId = catData[0].id;

  try {
    // 优先用 WooCommerce API（含价格等完整数据）
    const res = await api.get(`products?category=${categoryId}`);
    return res.data.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      image: product.images?.[0]?.src || extractImage(product.description) || null,
    }));
  } catch {
    // WooCommerce API 不可用时回退到 WordPress API
    const fallbackRes = await fetch(`${WP_API}/product?product_cat=${categoryId}`);
    const products = await fallbackRes.json();
    return products.map((product) => ({
      id: product.id,
      name: product.title.rendered,
      slug: product.slug,
      price: null,
      regular_price: null,
      sale_price: null,
      image: extractImage(product.content.rendered),
    }));
  }
}

function extractImage(html) {
  const match = html.match(/src="([^"]+)"/);
  return match ? match[1] : null;
}
