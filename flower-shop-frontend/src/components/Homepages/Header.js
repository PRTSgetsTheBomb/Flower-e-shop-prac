import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

function Header() {
    const [open, setOpen] = useState(false); // Occasions dropdown
    const [hidden, setHidden] = useState(false); // Hide header on scroll
    const lastScroll = useRef(0);

    useEffect(() => {
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

    return (
        <motion.div
            className="site-header"
            animate={{ y: hidden ? '-100%' : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            <div className="container header-inner">
                <div className="logo-row">
                    <Link to="/" className="logo">Pisces Flower</Link>
                </div>
                <div className="nav-row">
                    <nav className="main-nav">
                        <div className="dropdown">
                            <button
                                className="dropdown-toggle"
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
                                        <Link to="">Anniversary Flowers</Link>
                                        <Link to="">Sympathy Flowers</Link>
                                        <Link to="">New Baby Flowers</Link>
                                        <Link to="">Get Well Soon Flowers</Link>
                                        <Link to="">Celebration Flowers</Link>
                                        <Link to="">Graduation Flowers</Link>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <Link to="">Dried Flowers</Link>
                        <Link to="">Fresh Flowers</Link>
                        <Link to="">Flower Box</Link>
                        <Link to="">Wedding & Events</Link>
                        <Link to="">Contact</Link>
                    </nav>
                </div>
            </div>
        </motion.div>
    );
};

export default Header;