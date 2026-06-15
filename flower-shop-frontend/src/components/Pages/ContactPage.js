/**
 * 联系我们页面（/contact）
 *
 * 核心职责：展示店铺联系信息、地图位置、联系表单
 *
 * 设计说明：
 * - 左半部分：联系信息 + 嵌入式 Google 地图
 * - 右半部分：联系表单（姓名、邮箱、主题、留言）
 * - 电话和邮箱使用 <a href="tel:/mailto:"> 实现一键拨打/发送
 * - 表单提交后显示成功反馈，1.5 秒后恢复可再次提交
 * - 地图使用 iframe 嵌入，无需 API Key
 */

import React, { useState } from 'react';
import FadeInUp from '../Generic/FadeInUp';
import '../../PageStyles/ContactPage.css';

function ContactPage() {
    // 表单状态
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        // 简单前端校验
        if (!form.name || !form.email || !form.message) {
            setError('Please fill in name, email and message.');
            return;
        }
        // 模拟发送（后续对接真实 API 替换为 fetch）
        setSent(true);
        setForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSent(false), 1500);
    };

    return (
        <FadeInUp as="section" className="contact-page">
            <div className="container">
                <h1 className="contact-title">Contact Us</h1>

                <div className="contact-layout">
                    {/* ---- 左侧：信息 + 地图 ---- */}
                    <div className="contact-left">
                        <div className="contact-info">
                            <div className="contact-row">
                                <span className="contact-label">Phone</span>
                                <a href="tel:0433622255" className="contact-value">0433 XXX XXX</a>
                            </div>
                            <div className="contact-row">
                                <span className="contact-label">Email</span>
                                <a href="mailto:piscesflowerstudio@gmail.com" className="contact-value">XXXXXXXX@gmail.com</a>
                            </div>
                            <div className="contact-row">
                                <span className="contact-label">Address</span>
                                <span className="contact-value">Oakleigh South VIC 3167, Australia</span>
                            </div>
                            <div className="contact-row">
                                <span className="contact-label">Hours</span>
                                <span className="contact-value">Mon–Sat 9:00 am – 5:00 pm</span>
                            </div>
                        </div>

                        {/* 嵌入式地图 */}
                        <div className="contact-map">
                            <iframe
                                title="Pisces Flower Location"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12578.377066907957!2d145.091!3d-37.933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m3!3e6!4m0!4m0!5e1!3m2!1szh-CN!2sau!4v1680000000000"
                                width="100%"
                                height="260"
                                style={{ border: 0, borderRadius: 8 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>

                    {/* ---- 右侧：联系表单 ---- */}
                    <div className="contact-right">
                        <h2 className="contact-form-title">Send us a message</h2>
                        <form onSubmit={handleSubmit} className="contact-form">
                            <div className="form-group">
                                <label htmlFor="name">Name *</label>
                                <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Your name" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email *</label>
                                <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="subject">Subject</label>
                                <input id="subject" name="subject" type="text" value={form.subject} onChange={handleChange} placeholder="How can we help?" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Message *</label>
                                <textarea id="message" name="message" rows={5} value={form.message} onChange={handleChange} placeholder="Write your message here..." required />
                            </div>
                            {error && <p className="form-error">{error}</p>}
                            <button type="submit" className={`contact-submit${sent ? ' sent' : ''}`}>
                                {sent ? 'Sent ✓' : 'Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </FadeInUp>
    );
}

export default ContactPage;