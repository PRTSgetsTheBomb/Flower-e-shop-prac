/**
 * 退换货政策页面（/policies/refund-policy）
 *
 * 静态内容页面，展示退款、退换货条款。
 * 内容为固定文本，后续可从 CMS 获取。
 */

import React from 'react';
import '../../PageStyles/RefundPolicy.css';
import FadeInUp from '../Generic/FadeInUp';

function RefundPolicy() {
    return (
        <FadeInUp as="section" className="refund-page">
            <div className="container">
                <h1 className="refund-title">Return and Refund Policy</h1>
                <div className="refund-content">
                    <p>
                        Thank you for choosing Pisces Flower for your floral needs. We take great care in
                        preparing every order with the freshest, highest quality flowers. Because of the
                        perishable nature of our products, we have established the following policy to
                        ensure a smooth experience for both parties.
                    </p>

                    <h2>Freshness Guarantee</h2>
                    <p>
                        We stand behind the freshness of our flowers. If your arrangement arrives in less
                        than perfect condition, please contact us immediately. We will work with you to
                        make it right.
                    </p>

                    <h2>Perishable Items</h2>
                    <p>
                        All flower arrangements, bouquets, and plant products are considered perishable
                        and therefore cannot be returned. However, if there is a quality issue, we will
                        offer a replacement or store credit at our discretion.
                    </p>

                    <h2>Returns</h2>
                    <p>
                        We do not accept returns for change of mind. If you have an issue with your order,
                        please reach out to us within 24 hours of delivery at{' '}
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>.
                    </p>

                    <h2>Damaged, Incorrect, or Missing Items</h2>
                    <p>
                        If your order arrives damaged, is missing items, or contains the wrong items,
                        please contact us within 24 hours of delivery with your order number and photos
                        of the issue. We will investigate and provide a resolution, which may include a
                        replacement, refund, or store credit.
                    </p>

                    <h2>Change of Mind</h2>
                    <p>
                        As flowers are perishable and often prepared specifically for each order, we
                        cannot accept returns or offer refunds for change of mind. Please double-check
                        your selection before placing an order.
                    </p>

                    <h2>Cancellations</h2>
                    <p>
                        Orders can be cancelled up to 2 hours before the scheduled delivery time for
                        same-day deliveries, or up to 24 hours before for future-dated orders. Please
                        note that orders for custom arrangements or large events may have different
                        cancellation terms — please contact us directly for details.
                    </p>

                    <h2>Custom and Perishable Products</h2>
                    <p>
                        Custom floral arrangements, event orders, and specialty products are
                        non-refundable once preparation has begun. If exceptional circumstances arise,
                        please contact us and we will do our best to accommodate.
                    </p>

                    <h2>Refund Timing</h2>
                    <p>
                        If a refund is issued, it will be processed back to the original payment method
                        within 5&ndash;10 business days, depending on your bank or card issuer.
                    </p>

                    <h2>Contact</h2>
                    <p>
                        If you have any questions or concerns regarding your order, please don't
                        hesitate to contact us at{' '}
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default RefundPolicy;