/**
 * 博客列表页（/blogs）
 *
 * 核心职责：从 WordPress API 获取并展示文章列表
 *
 * 设计说明：
 * - 与商品加载相同模式：useState + useEffect + 三态渲染（加载/空/列表）
 * - 文章卡片包含图片、标题、日期、摘要，点击跳转到 /blogs/:slug
 * - dangerouslySetInnerHTML 渲染 excerpt（来自 WP API 的 HTML 格式摘要）
 * - 日期用 toLocaleDateString() 格式化为本地可读格式
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPosts } from '../../api/articles';
import Loading from '../../components/Loading';
import '../PageStyles/BlogPage.css';
import FadeInUp from '../../components/FadeInUp';

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <FadeInUp as="section" className="blog-page">
      <div className="container">
        <h1 className="blog-title">Blog</h1>

        {loading ? (
          <Loading />
        ) : posts.length === 0 ? (
          <p className="blog-empty">No articles yet.</p>
        ) : (
          <div className="blog-list">
            {posts.map((post) => (
              <article key={post.id} className="blog-card">
                {post.image && (
                  <Link to={`/blogs/${post.slug}`} className="blog-card-image">
                    <img src={post.image} alt={post.title} />
                  </Link>
                )}
                <div className="blog-card-body">
                  <h2>
                    <Link to={`/blogs/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="blog-meta">{new Date(post.date).toLocaleDateString()}</p>
                  <div className="blog-excerpt" dangerouslySetInnerHTML={{ __html: post.excerpt }} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
        </FadeInUp>
    );
}

export default BlogPage;
