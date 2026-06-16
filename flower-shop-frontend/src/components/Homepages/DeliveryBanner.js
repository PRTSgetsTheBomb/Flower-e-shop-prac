import React, { useState } from 'react';
import '../../HomePageStyles/Header.css';

function DeliveryBanner() {
  const [dismissed, setDismissed] = useState(false);
  const isBefore1PM = new Date().getHours() < 13;

  if (dismissed) return null;

  return (
    <div className="delivery-banner">
      <span className="delivery-banner-text">
        {isBefore1PM
          ? 'Order before 1PM for same-day delivery. Ready to send today!'
          : 'Orders placed after 1PM will be delivered tomorrow. Order now for next-day delivery!'}
      </span>
      <button
        className="delivery-banner-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default DeliveryBanner;