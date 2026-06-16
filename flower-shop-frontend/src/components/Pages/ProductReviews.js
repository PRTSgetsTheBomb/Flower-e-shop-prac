/**
 * 商品评价组件
 *
 * 支持留评（星级 + 文字），按时间倒序展示。
 * 数据以 localStorage 按商品 ID 存储。
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserOrders } from '../../utils/orders';
import '../../PageStyles/ProductReviews.css';

const STORAGE_KEY = 'product_reviews';

function loadReviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveReviews(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

const STAR = '★';
const STAR_O = '☆';

export default function ProductReviews({ productId, productName }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasPurchased(false);
      return;
    }
    const orders = getUserOrders(user.email);
    const purchased = orders.some(order =>
      order.items.some(item => String(item.id) === String(productId))
    );
    setHasPurchased(purchased);
  }, [user, productId])

  const refresh = useCallback(() => {
    const all = loadReviews();
    setReviews(all[productId] || []);
  }, [productId]);

  useEffect(refresh, [refresh]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) { setSubmitMsg('Please select a star rating.'); return; }
    if (!text.trim()) { setSubmitMsg('Please write a review.'); return; }

    const all = loadReviews();
    const list = all[productId] || [];
    const newReview = {
      id: Date.now(),
      author: user?.name,
      rating,
      text: text.trim(),
      date: new Date().toISOString(),
    };
    all[productId] = [newReview, ...list];
    saveReviews(all);
    setRating(0);
    setText('');
    setSubmitMsg('');
    refresh();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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
              </div>
              <p className="review-text">{r.text}</p>
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

        {user ? (
          hasPurchased ? (
            <button type="submit" className="review-submit">Submit Review</button>
          ) : (
            <button type="button" className="review-submit review-submit-disabled" disabled>
              You must purchase this product to review
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
