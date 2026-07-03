/**
 * 通用加载指示器
 *
 * 在数据请求期间显示，提供视觉反馈。
 * 被 FeaturedProducts、CollectionPages、SearchPage、
 * ProductDetail、BlogPage 等多个组件复用。
 * 当前为简单文字，后续可替换为 spinner 动画。
 */

import React from 'react';
function Loading() {
  return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
      Loading...
    </div>
  );
}
export default Loading;