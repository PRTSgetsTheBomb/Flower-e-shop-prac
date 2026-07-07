/**
 * HTTP 工具函数
 *
 * 安全发起 fetch 请求，失败或非 200 时返回空数组而非抛错。
 * 原本在 products.js 和 articles.js 中各有一份重复实现，现提取到此处共享。
 */

export async function safeFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
