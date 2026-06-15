/**
 * 博客文章详情页（/blogs/:slug）
 *
 * 核心职责：根据 slug 获取并展示单篇文章完整内容
 *
 * 设计说明：
 * - 与 ProductDetail 相同的三态渲染模式：loading → not found → 内容
 * - useParams 获取 URL 中的 slug，useEffect 依赖 [slug] 实现路由变化时重新请求
 * - 文章内容用 dangerouslySetInnerHTML 渲染（WP API 返回 HTML 格式）
 * - 底部提供"返回博客列表"链接
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPostBySlug } from '../../api/articles';
import Loading from '../Generic/Loading';
import '../../PageStyles/BlogPostPage.css';
import FadeInUp from '../Generic/FadeInUp';

function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPostBySlug(slug)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <section className="blog-post-page"><div className="container"><Loading /></div></section>;
  if (!post) return (
    <FadeInUp as="section" className="blog-post-page">
      <div className="container">
        <p className="blog-post-notfound">Article not found.</p>
        <Link to="/blogs" className="blog-post-back">Back to Blog</Link>
      </div>
    </FadeInUp>
  );

  return (
    <FadeInUp as="section" className="blog-post-page">
      <div className="container">
        <div className="blog-post-header">
          {post.image && (
            <img src={post.image} alt={post.title} className="blog-post-image" />
          )}
          <h1 className="blog-post-title">{post.title}</h1>
          <p className="blog-post-meta">{new Date(post.date).toLocaleDateString()}</p>
        </div>
        <div className="blog-post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
        <Link to="/blogs" className="blog-post-back">Back to Blog</Link>
      </div>
    </FadeInUp>
  )
}

export default BlogPostPage;
