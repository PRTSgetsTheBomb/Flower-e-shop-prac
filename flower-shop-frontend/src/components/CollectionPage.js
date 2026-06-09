import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAllProducts, fetchProductsByCategory } from '../api/products';
import './CollectionPage.css';
import Loading from './Generic/Loading';

function CategoryPage() {
    const { slug } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const fetch = slug === 'available-today'
            ? fetchAllProducts(100)
            : fetchProductsByCategory(slug);
        Promise.resolve(fetch)
            .then(setProducts)
            .finally(() => setLoading(false));
    }, [slug]);

    const title = slug === 'available-today' ? 'Available Today' : slug;

    return (
        <section className="category-page">
            <div className="container">
                <h2 className="section-title">{title}</h2>
                {loading ? (
                    <Loading />
                ) : products.length === 0 ? (
                    <p className="empty-text">No products found.</p>
                ) : (
                    <div className="product-grid">
                        {products.map((product) => (
                            <Link key={product.id}
                                to={`/product/${product.slug}`}
                                className="product-card"
                            >
                                {product.image && (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="product-image"
                                    />
                                )}
                                <h3 className="product-name">{product.name}</h3>
                                {product.price && (
                                    <p className="product-price">
                                        {product.sale_price ? (
                                            <>
                                                <span className="regular-price">${product.regular_price}</span>
                                                <span className="sale-price">${product.sale_price}</span>
                                            </>
                                        ) : (
                                            <span>${product.price}</span>
                                        )}
                                    </p>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default CategoryPage;
