import React from 'react';
import { Link } from 'react-router-dom';
import './Banner.css';

function Banner() {
    return (
        <section className="banner">
            <div className='container content'>
                <h1>Flowers for everyone</h1>
                <p>Send flowers and keep smells in hands</p>
                <Link to="" className="btn-primary">SHOP AVAILABLE TODAY</Link>
            </div>
        </section>
    );
};

export default Banner;