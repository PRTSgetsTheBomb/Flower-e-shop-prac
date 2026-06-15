/**
 * 图片放大查看（Lightbox）
 *
 * 点击图片时在屏幕中央显示大图，支持键盘 ESC 关闭。
 * 纯 CSS 实现，无额外依赖。
 */
import React, { useEffect } from 'react';
import '../../PageStyles/ImageLightbox.css';

export default function ImageLightbox({ src, alt, onClose }) {
  // ESC 键关闭
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // 打开时禁止页面滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!src) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img
        className="lightbox-image"
        src={src}
        alt={alt || 'Enlarged image'}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
