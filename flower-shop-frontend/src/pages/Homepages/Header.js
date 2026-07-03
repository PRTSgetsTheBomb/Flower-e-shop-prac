/**
 * 全站顶部导航栏组件
 *
 * 设计说明：
 * - 搜索用 navigate 跳转到 /search?q=xxx，将搜索参数放在 URL 中，保证结果页可分享、可刷新、可回退
 * - 使用 encodeURIComponent 防止用户输入 &、# 等特殊字符破坏 URL 结构
 * - 滚动隐藏用 useRef 存上次滚动位置而非 useState，因为该值只需比较不需要触发重渲染
 * - 80px 阈值是经验值，作为"缓冲区"避免用户轻微滚动就触发隐藏
 * - useEffect 注册 scroll 监听并返回清理函数，组件卸载时移除监听防止内存泄漏
 * - { passive: true } 告诉浏览器不调用 preventDefault()，提升滚动性能
 * - 用 sticky 定位而非 fixed，隐藏时页面内容自然上移不留下空白
 * - NavLink 自动根据当前路由添加 active 类，无需手动判断
 * - Occasions 按钮手动用 some() + startsWith 判断，因为需要检测多个子路由中的任意一个
 * - onBlur 关闭下拉菜单比"点击外部关闭"的事件监听更简洁
 * - AnimatePresence 能正确处理组件卸载时的退出动画，纯 CSS 难以实现
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import occasions from '../../components/occasions';
import '../HomePageStyles/Header.css';

function Header() {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false); // Occasions dropdown
    const [hidden, setHidden] = useState(false); // Hide header on scroll
    const lastScroll = useRef(0); // 用 ref 存滚动位置，避免 setState 触发不必要的重渲染

    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const isActive = (path) => pathname.startsWith(path);

    // 按 Enter 时跳转到搜索页，搜索参数放在 URL 中方便分享和回退
    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };

    useEffect(() => {
        // 向下滚动超过 80px 时隐藏头部，向上滚动时重新显示
        const handleScroll = () => {
            const current = window.scrollY;
            if (current > lastScroll.current && current > 80) {
                setHidden(true);
            } else {
                setHidden(false);
            }
            lastScroll.current = current;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 点击导航链接时关闭移动端菜单
    const navRef = useRef(null);
    useEffect(() => {
        const handleNavClick = (e) => {
            if (e.target.tagName === 'A') setMenuOpen(false);
        };
        const nav = navRef.current;
        if (nav) nav.addEventListener('click', handleNavClick);
        return () => { if (nav) nav.removeEventListener('click', handleNavClick); };
    }, []);

    return (
        <motion.div
            className="site-header"
            animate={{ y: hidden ? '-100%' : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            <div className="container">
                <div className="header-top">
                    <div className="search-row">
                        <input type="text" className="search-input" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
                        <button className="search-btn" onClick={() => { if (searchQuery.trim()) { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery(''); } }}>🔍</button>
                    </div>
                    <div className="logo-row">
                        <Link to="/" className="logo">Pisces Flower</Link>
                    </div>
                    <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                        <span className={`hamburger-line${menuOpen ? ' open' : ''}`}></span>
                        <span className={`hamburger-line${menuOpen ? ' open' : ''}`}></span>
                        <span className={`hamburger-line${menuOpen ? ' open' : ''}`}></span>
                    </button>
                    <div className="header-actions">
                        <Link to="/account" className="header-icon" title="My Account">👤</Link>
                        <Link to="/cart" className="header-icon" title="Cart">🛒</Link>
                    </div>
                </div>
                <div className={`nav-row${menuOpen ? ' open' : ''}`}>
                    <nav className="main-nav" ref={navRef}>
                        <div className="dropdown">
                            <button
                                className={`dropdown-toggle${occasions.some((o) => isActive(o.link)) ? ' active' : ''}`}
                                onClick={() => setOpen(!open)}
                                onBlur={() => setOpen(false)}
                            >
                                Occasions
                                <motion.span
                                    className="arrow"
                                    animate={{ rotate: open ? 180 : 0 }}
                                    transition={{ duration: 0.25 }}
                                >▾</motion.span>
                            </button>
                            <AnimatePresence>
                                {open && (
                                    <motion.div
                                        className="dropdown-menu"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {occasions.map((item) => (
                                            <NavLink key={item.slug} to={item.link} className={({ isActive }) => isActive ? 'active' : ''}>{item.title}</NavLink>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <NavLink to="/collections/dried-flowers" className={({ isActive }) => isActive ? 'active' : ''}>Dried Flowers</NavLink>
                        <NavLink to="/collections/fresh-flowers" className={({ isActive }) => isActive ? 'active' : ''}>Fresh Flowers</NavLink>
                        <NavLink to="/collections/flower-box" className={({ isActive }) => isActive ? 'active' : ''}>Flower Box</NavLink>
                        <NavLink to="/events" className={({ isActive }) => isActive ? 'active' : ''}>Wedding & Events</NavLink>
                        <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>Contact</NavLink>
                    </nav>
                </div>
            </div>
        </motion.div>
    );
};

export default Header;