/**
 * 婚礼/活动页面（/events）
 *
 * 核心职责：展示婚礼花艺、企业活动的服务介绍
 * - 静态内容页面，含多张配图和详细文字介绍
 * - "Free Quotation"区域提供免费报价入口
 */

import React from 'react';
import { Link } from 'react-router-dom';
import FadeInUp from '../../components/FadeInUp';
import '../PageStyles/EventPage.css';

function EventPage() {
    return (
        <FadeInUp as="section" className="event-page">
            <div className="container">
                <h1 className="event-title">Wedding Bouquet &amp; Flower Arrangements</h1>
                <div className="event-divider">
                    <p className="event-intro-text">
                        If you're thinking about creating the most surreal wedding decoration for your big day,
                        you've landed on the right page. At Pisces Flower, it's all about the moments.
                        Our wedding florists create through beautiful floral arrangements and wedding decor.
                        In the hope to inspire you, our wedding florists will guide you through the different options that might work the best.
                        Whether it's wedding bouquets or complete decor, we can bring magic to every aspect of your wedding.
                    </p>
                </div>

                <div className="event-split">
                    <div className="event-image">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/20230417210244.jpg?v=1681729461&width=1070"
                            alt="Wedding flowers"
                        />
                    </div>
                    <div className="event-text">
                        <p>
                            Are you getting hitched?
                            Or you're unsure which flowers to choose for your bouquet?
                            Or for the table centrepieces and the bridesmaid bouquet?
                            Take help from our wedding florists to create the perfect wedding décor for your wedding.
                            At Pisces Flower, we have a gorgeous collection of wedding flowers to offer the beautiful & romantic touch that you need on your special day.
                            If you are looking for the highest quality blooms available, crafted individually for you by perfectionist floral designers,
                            then it sounds like we're perfect match!Whether it's roses or lilies, tulips, orchids, dried flowers, preserved flowers,
                            get the best of the wedding flowers colour your wedding occasion. From simple table decoration to custom wedding bouquets,
                            our attention to detail, creativity & perfection helps to set up the ambience you dreamed of.
                        </p>
                    </div>
                </div>

                <div className="event-services">
                    <div className="service-card">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/wedding-flowers-and-rings.jpg?v=1646709800&width=750"
                            alt="Bridal Bouquet"
                        />
                        <h3>Bridal Bouquet</h3>
                    </div>
                    <div className="service-card">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/20260317204811_97_14.jpg?v=1773740922&width=750"
                            alt="Bridesmaid Bouquet"
                        />
                        <h3>Bridesmaid Bouquet</h3>
                    </div>
                    <div className="service-card">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/20260317205054_99_14.jpg?v=1773741075&width=750"
                            alt="Table Centerpiece"
                        />
                        <h3>Table Centerpiece</h3>
                    </div>
                </div>

                <div className="event-split">
                    <div className="event-image">
                        <img
                            src="https://piscesflower.com.au/cdn/shop/files/wedding-bouquets.jpg?v=1646625502&width=1070"
                            alt="Wedding Events"
                        />
                    </div>
                    <div className="event-text">
                        <h2>Customised Wedding Flower Arrangements</h2>
                        <p>
                            Depending on your style, flower preference & the location of your ceremony,
                            we can offer the wedding decor that beautifies the occasion to another level.
                            Whether it's the aisle or wedding flower bouquet, bridesmaid & bridegroom bouquets,
                            wedding décor for the whole venue, we put in so much effort, ideas,
                            and creativity to make your wedding a grand & unique celebration.
                            Whether you have a detailed brief or a just a BIG IDEA,
                            Pisces Flower will take your event from concept to gorgeous reality.
                            Our expert stylists and designers will nail your creative brief.
                        </p>
                    </div>
                </div>

                <div className="event-divider event-divider-last">
                    <p className="event-intro-text">
                        As experts in dried flowers & preserved flower arrangements,
                        we can fit into any theme you love.
                        Whether you love a rustic style or a boho-chic or minimalist and prefer including beautiful dried flower arrangements or preserved flowers in the interiors,
                        we can make it up for you. Is your wedding coming soon? Want to personalise the wedding décor?
                        Talk to our expert wedding florists from Pisces Flower.
                        For wedding décor consultations, call 0433 XXX XXX today.
                    </p>
                </div>

                <div className="quote-section">
                    <h2 className="quote-title">Free Quotation</h2>
                    <form className="quote-form">
                        <div className="quote-field">
                            <label>Name</label>
                            <input type="text" />
                        </div>
                        <div className="quote-field">
                            <label>Email *</label>
                            <input type="email" required />
                        </div>
                        <div className="quote-field">
                            <label>Phone number</label>
                            <input type="tel" />
                        </div>
                        <div className="quote-field">
                            <label>Comment</label>
                            <textarea rows={4} />
                        </div>
                        <button type="submit" className="quote-btn">Send</button>
                    </form>
                </div>
            </div>
        </FadeInUp>
    );
}

export default EventPage;
