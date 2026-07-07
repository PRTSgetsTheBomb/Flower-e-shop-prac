import { safeFetch } from '../utils/http';

/**
 * 文章数据 API 模块
 *
 * 从 WordPress REST API 获取博客文章
 * 使用与 products.js 相同的 WP_API 基础地址
 */

const WP_API = `${process.env.REACT_APP_WC_URL}/wp-json/wp/v2`;

// 从 WP API 的 _embedded 字段中提取特色图片 URL
// 优先取原图，降级到 medium 尺寸
function extractImage(post) {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url
    || post._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url
    || null;
}

// 文章列表数据映射（不含完整 content，减少数据传输量）
function mapPost(post) {
  return {
    id: post.id,
    title: post.title?.rendered || '',
    slug: post.slug,
    excerpt: post.excerpt?.rendered || '',
    date: post.date,
    image: extractImage(post),
  };
}

// 文章详情数据映射（含完整 content，用于详情页）
function mapPostDetail(post) {
  return {
    id: post.id,
    title: post.title?.rendered || '',
    slug: post.slug,
    content: post.content?.rendered || '',
    excerpt: post.excerpt?.rendered || '',
    date: post.date,
    image: extractImage(post),
  };
}


/**
 * 获取文章列表
 */
export async function fetchPosts(perPage = 20) {
  const data = await safeFetch(`${WP_API}/posts?_embed&per_page=${perPage}&orderby=date&order=desc`);
  return data.map(mapPost);
}

/**
 * 根据 slug 获取单篇文章详情
 */
export async function fetchPostBySlug(slug) {
  try {
    const res = await fetch(`${WP_API}/posts?_embed&slug=${slug}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return mapPostDetail(data[0]);
  } catch {
    return null;
  }
}
