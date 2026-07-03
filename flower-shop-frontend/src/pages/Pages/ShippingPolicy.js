/**
 * 配送政策页面（/policies/shipping-policy）
 *
 * 静态内容页面，展示配送时间、范围、费用等条款。
 */

import React from 'react';
import '../PageStyles/RefundPolicy.css';
import FadeInUp from '../../components/FadeInUp';

function ShippingPolicy() {
    return (
        <FadeInUp as="section" className="refund-page">
            <div className="container">
                <h1 className="refund-title">Shipping Policy</h1>
                <div className="refund-content">
                    <h2>Shipping and Delivery Policy</h2>
                    <p>
                        At Pisces Flower, we strive to deliver your floral arrangements in perfect
                        condition and on time. Please review our delivery policy below.
                    </p>

                    <h2>Same-Day Delivery</h2>
                    <p>
                        We offer same-day delivery for orders placed before 1:00 pm local Melbourne
                        time, subject to availability, delivery location, and order volume. Orders
                        placed after this time will be scheduled for the next available delivery day.
                    </p>

                    <h2>Delivery Areas and Fees</h2>
                    <p>
                        We deliver to a wide range of suburbs across Melbourne. Delivery fees vary
                        depending on the suburb and are calculated and displayed at checkout before
                        you confirm your order.
                    </p>

                    <h2>Delivery Timing</h2>
                    <p>
                        While we do our best to deliver within your selected window, delivery times
                        are not guaranteed unless confirmed in writing. Factors that may affect
                        delivery include traffic, weather conditions, courier availability, building
                        access, hospitals and apartments, events, and incorrect or incomplete delivery
                        details provided by the customer.
                    </p>

                    <h2>Incorrect or Incomplete Delivery Details</h2>
                    <p>
                        It is the customer's responsibility to provide accurate and complete delivery
                        information, including the recipient's full name, phone number, address, and
                        any relevant access instructions. Incorrect details may delay or prevent
                        delivery and may incur additional fees for re-delivery.
                    </p>

                    <h2>Recipient Unavailable</h2>
                    <p>
                        If the recipient is unavailable at the time of delivery, our courier may leave
                        the order in a safe place, contact the recipient or sender for instructions, or
                        attempt re-delivery. Please note that fresh flowers may be affected if not
                        delivered and received promptly.
                    </p>

                    <h2>Contact</h2>
                    <p>
                        If you have any questions about delivery or your order, please contact us at{' '}
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default ShippingPolicy;
