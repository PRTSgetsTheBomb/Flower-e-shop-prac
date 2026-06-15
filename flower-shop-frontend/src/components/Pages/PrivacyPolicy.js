/**
 * 隐私政策页面（/policies/privacy-policy）
 *
 * 静态内容页面，展示个人信息收集、使用和保护条款。
 */

import React from 'react';
import '../../PageStyles/RefundPolicy.css';
import FadeInUp from '../Generic/FadeInUp';

function PrivacyPolicy() {
    return (
        <FadeInUp as="section" className="refund-page">
            <div className="container">
                <h1 className="refund-title">Privacy Policy</h1>
                <div className="refund-content">
                    <p>
                        Pisces Flower respects your privacy. This policy outlines how we collect, use,
                        and protect your personal information when you use our website.
                    </p>
                    <p>
                        We collect information you provide when placing an order, such as your name,
                        email address, phone number, and delivery address. This information is used
                        solely to process and fulfill your orders, communicate with you about your
                        purchase, and improve our services.
                    </p>
                    <p>
                        We do not share, sell, or rent your personal information to third parties,
                        except as required to process your order (e.g., sharing delivery details with
                        our courier partners) or as required by law.
                    </p>
                    <p>
                        If you have any questions about this policy, please contact us at{' '}
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>.
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default PrivacyPolicy;
