/**
 * 商品评价组件
 *
 * 支持留评（星级 + 文字），按时间倒序展示。
 * 数据通过后端 API 读写。
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../PageStyles/ProductReviews.css';

const API_BASE = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const STAR = '★';
const STAR_O = '☆';

export default function ProductReviews({ productId, productName, orderId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletedMsg, setDeletedMsg] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasPurchased(false);
      setVerifying(false);
      return;
    }

    const token = localStorage.getItem('jwt_token');

    if (orderId) {
      fetch(`${API_BASE}/api/order/${orderId}`)
        .then(r => r.json())
        .then(data => {
          setHasPurchased(data.status === 'completed');
          setVerifying(false);
        })
        .catch(() => {
          setHasPurchased(false);
          setVerifying(false);
        });
    } else if (token) {
      fetch(`${API_BASE}/api/can-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, productId }),
      })
        .then(r => r.json())
        .then(data => {
          setHasPurchased(data.canReview);
          setVerifying(false);
        })
        .catch(() => {
          setHasPurchased(false);
          setVerifying(false);
        });
    } else {
      setHasPurchased(false);
      setVerifying(false);
    }
  }, [user, productId, orderId])

// 从后端拉取评价，后端不可用时回退到 localStorage
  const refresh = useCallback(() => {
    fetch(`${API_BASE}/api/reviews?productId=${productId}`)
      .then(r => r.json())
      .then(setReviews)
      .catch(() => {
        // 后端不可用，读本地缓存
        try {
          const all = JSON.parse(localStorage.getItem('product_reviews')) || {};
          setReviews(all[productId] || []);
        } catch {
          setReviews([]);
        }
      });
  }, [productId]);

  useEffect(refresh, [refresh]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setSubmitMsg('Please select a star rating.'); return; }
    if (!text.trim()) { setSubmitMsg('Please write a review.'); return; }

    setSubmitting(true);
    setSubmitMsg('');

    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, productId, rating, text: text.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRating(0);
        setText('');
        refresh();
      } else {
        setSubmitMsg(data.error || 'Failed to submit review.');
      }
    } catch {
      // 后端不可用，写入 localStorage
      const newReview = {
        id: Date.now(),
        author: user?.name || 'Anonymous',
        rating,
        text: text.trim(),
        date: new Date().toISOString(),
      };
      try {
        const all = JSON.parse(localStorage.getItem('product_reviews')) || {};
        all[productId] = [newReview, ...(all[productId] || [])];
        localStorage.setItem('product_reviews', JSON.stringify(all));
      } catch {}
      setRating(0);
      setText('');
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // 删除评价
  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reviewId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error();
    } catch {
      // 后端不可用，从 localStorage 删除
      try {
        const all = JSON.parse(localStorage.getItem('product_reviews')) || {};
        all[productId] = (all[productId] || []).filter((r) => r.id !== reviewId);
        localStorage.setItem('product_reviews', JSON.stringify(all));
      } catch {}
    }
    setDeletedMsg('Review deleted');
    setTimeout(() => setDeletedMsg(''), 2500);
    refresh();
  };

  return (
    <section className="reviews-section">
      <h2 className="reviews-title">Customer Reviews</h2>

      {/* 评分摘要 */}
      <div className="reviews-summary">
        {avgRating ? (
          <>
            <span className="reviews-avg">{avgRating}</span>
            <span className="reviews-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= Math.round(+avgRating) ? 'star-filled' : 'star-empty'}>{STAR}</span>
              ))}
            </span>
            <span className="reviews-count">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
          </>
        ) : (
          <p className="reviews-empty">No reviews yet. Be the first to review!</p>
        )}
      </div>

      {/* 评价列表 */}
      {reviews.length > 0 && (
        <div className="reviews-list">
          {reviews.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span className="review-author">{r.author}</span>
                <span className="review-stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= r.rating ? 'star-filled' : 'star-empty'}>{STAR}</span>
                  ))}
                </span>
                <span className="review-date">{new Date(r.date).toLocaleDateString()}</span>
                {user?.name === r.author && (
                  <button className="review-delete" onClick={() => handleDelete(r.id)} title="Delete review">✕</button>
                )}
              </div>
              <p className="review-text">{r.text}</p>
              {r.reply && (
                <div className="review-reply">
                  <span className="review-reply-author">{r.reply.author} — Store Owner</span>
                  <p className="review-reply-text">{r.reply.text}</p>
                  <span className="review-reply-date">{new Date(r.reply.date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 留评表单 */}
      <form className="review-form" onSubmit={handleSubmit}>
        <h3>Write a Review</h3>

        <div className="review-rating">
          <label>Your Rating *</label>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className={`star-btn${i <= (hover || rating) ? ' active' : ''}`}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
              >
                {i <= (hover || rating) ? STAR : STAR_O}
              </button>
            ))}
          </div>
        </div>

        <div className="review-field">
          <label htmlFor="review-text">Your Review *</label>
          <textarea
            id="review-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience with this product..."
            maxLength={500}
          />
          <span className="field-hint">{text.length}/500</span>
        </div>

        {submitMsg && <p className="review-error">{submitMsg}</p>}
        {deletedMsg && <p className="review-success">{deletedMsg}</p>}

        {verifying ? (
          <p className="review-verifying">Checking purchase status...</p>
        ) : user ? (
          hasPurchased ? (
            <button type="submit" className="review-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          ) : (
            <button type="button" className="review-submit review-submit-disabled" disabled>
              You must purchase and receive this product to review
            </button>
          )
        ) : (
          <button type="button" className="review-submit" onClick={() => navigate('/account', { state: { from: location.pathname } })}>
            Login to Review
          </button>
        )}
      </form>
    </section>
  );
}
