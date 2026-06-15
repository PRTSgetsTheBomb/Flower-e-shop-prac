/**
 * 服务条款页面（/policies/terms-of-services）
 *
 * 静态内容页面，展示使用网站和服务的条款与条件。
 */

import React from 'react';
import '../../PageStyles/RefundPolicy.css';
import FadeInUp from '../Generic/FadeInUp';

function TermsOfService() {
    return (
        <FadeInUp as="section" className="refund-page">
            <div className="container">
                <h1 className="refund-title">Terms of Service</h1>
                <div className="refund-content">
                    <p>
                        By using the Pisces Flower website and placing an order, you agree to the
                        following terms and conditions.
                    </p>
                    <p>
                        All prices are listed in Australian Dollars (AUD) and include GST where
                        applicable. We reserve the right to modify prices at any time without prior
                        notice. Payment is required at the time of purchase.
                    </p>
                    <p>
                        We make every effort to display accurate product images and descriptions,
                        however variations in colour and appearance may occur due to monitor settings
                        and seasonal availability. In such cases, we reserve the right to substitute
                        with items of equal or higher value.
                    </p>
                    <p>
                        By placing an order, you confirm that the delivery information provided is
                        accurate and that you are authorised to make the purchase. Please refer to our{' '}
                        <a href="/policies/shipping-policy">Shipping Policy</a> and{' '}
                        <a href="/policies/refund-policy">Return and Refund Policy</a> for further details.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default TermsOfService;
