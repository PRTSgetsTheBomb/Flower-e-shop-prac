import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProducts } from '../../api/products.js';
import Loading from '../Generic/Loading.js';
import './Collection.css';

function Category() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllProducts(8)
            .then(setProducts)
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className="category-section">
            <div className="container">
                <h2 className="section-title">Today's Flower Picks for Delivery</h2>
                <div className="product-grid">
                    {loading ? (
                        <Loading />
                    ) : (
                        products.map((product) => (
                            <Link key={product.id}
                                to={`/product/${product.slug}`}
                                className="product-card"
                            >
                                {product.image && (
                                    <img src={product.image} alt={product.name} className="product-image" />
                                )}
                                <span className="product-name">{product.name}</span>
                                {product.price && (
                                    <span className="product-price">
                                        {product.sale_price ? (
                                            <>
                                                <span className="regular-price">${product.regular_price}</span>
                                                <span className="sale-price">${product.sale_price}</span>
                                            </>
                                        ) : (
                                            `$${product.price}`
                                        )}
                                    </span>
                                )}
                            </Link>
                        ))
                    )}
                </div>
                <div className="view-all-wrapper">
                    <Link to="/collections/available-today" className="btn-view-all">View All</Link>
                </div>
            </div>
        </section>
    );
};

export default Category;