/**
 * 搜索结果页（/search?q=xxx�?
 *
 * 核心职责：从 URL 获取搜索关键词，调用 API 并展示结�?
 *
 * 设计说明�?
 *
 * 1. 【URL 驱动搜索�?
 *    搜索词从 URL �??q= 参数获取，而不是从 state �?props�?
 *    好处是搜索结果页�?URL 可以直接分享给他人，对方打开看到相同结果�?
 *    这也支持浏览器前�?后退按钮�?
 *
 * 2. 【useSearchParams�?
 *    React Router v6 提供�?Hook，用于读取和修改 URL 查询参数�?
 *    类似�?useState，但数据源是 URL 而不是内存�?
 *    �?URL 变化时组件自动重新渲染�?
 *
 * 3. 【useEffect 依赖 [query]�?
 *    �?query 变化时自动触发搜索。这意味着�?
 *    - 从首页搜索跳转过来（?q=roses）→ 自动搜索 "roses"
 *    - 用户手动修改 URL�?q=lily）→ 自动重新搜索
 *    - 不需要额外的"搜索按钮"点击事件
 *
 * 4. 【最小搜索长度限制�?
 *    if (!query || query.trim().length < 2) return;
 *    少于 2 个字符不发起搜索请求，因为太短的关键词结果太多且不准确�?
 *    UI 上会显示 "Enter at least 2 characters to search."
 *
 * 5. 【多状态渲染�?
 *    搜索页有 4 种可能的 UI 状态，通过嵌套三元表达式处理：
 *    - URL �?query：显示默认提�?
 *    - query 少于 2 字符：显示字符数提示
 *    - loading：显�?Loading 组件
 *    - 无结果：显示 "No products found"
 *    - 有结果：显示商品网格
 *
 * 6. 【loading 初始值为 false�?
 *    �?FeaturedProducts 不同，搜索页�?loading 初始�?false�?
 *    因为首次进入时可能没�?query（用户直接访�?/search），不需要加载�?
 *    只有发起搜索时才 setLoading(true)�?
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FadeInUp from '../common/FadeInUp';
import { searchProducts } from '../../api/products';
import Loading from '../common/Loading';
import ProductCard from '../common/ProductCard';
import '../../styles/product.css';
import '../../styles/SearchPage.css';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';  // �?URL 获取搜索�?
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false); // 初始 false，无 query 时不加载

  // URL �?query 变化时自动搜�?
  useEffect(() => {
    if (!query || query.trim().length < 2) return; // 太短不搜�?
    setLoading(true);
    searchProducts(query)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <FadeInUp as="section" className="search-page">
      <div className="container">
        <h1 className="search-title">
          {query ? `Results for "${query}"` : 'Search Products'}
        </h1>
        {!query || query.length < 2 ? (
          <p className="search-empty">Enter at least 2 characters to search.</p>
        ) : loading ? (
          <Loading />
        ) : products.length === 0 ? (
          <p className="search-empty">No products found for "{query}".</p>
        ) : (
          <div className="product-grid">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} animated delay={i * 0.06} />
            ))}
          </div>
        )}
      </div>
    </FadeInUp>
  );
}

export default SearchPage;
