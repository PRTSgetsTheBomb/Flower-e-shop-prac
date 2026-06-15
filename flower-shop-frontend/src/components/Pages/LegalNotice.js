/**
 * 法律声明页面（/policies/legal-notice）
 *
 * 静态内容页面，展示网站的法律声明和免责条款。
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import '../../PageStyles/RefundPolicy.css';

function LegalNotice() {
    return (
        <FadeInUp as="section" className="refund-page">
            <div className="container">
                <h1 className="refund-title">Legal Notice</h1>
                <div className="refund-content">
                    <p>
                        This website is operated by Pisces Flower.
                    </p>
                    <p>
                        <strong>Website:</strong>{' '}
                        <a href="https://piscesflower.com.au/" target="_blank" rel="noopener noreferrer">
                            https://piscesflower.com.au/
                        </a>
                        <br />
                        <strong>Contact:</strong>{' '}
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>
                    </p>
                    <p>
                        Pisces Flower provides fresh flowers, dried flowers, preserved flowers, plants, arrangements, gifts,
                        and related products through this online store.
                    </p>
                    <p>
                        All purchases made through this website are subject to our published store policies, 
                        including our Terms of Service, Privacy Policy, Shipping and Delivery Policy, and Return and Refund Policy.
                    </p>
                    <p>
                        If you have any questions about this website, your order, or our store policies, please contact us at:
                        <a href="mailto:piscesflowerstudio@gmail.com">piscesflowerstudio@gmail.com</a>
                    </p>
                </div>
            </div>
        </FadeInUp>
    );
}

export default LegalNotice;
