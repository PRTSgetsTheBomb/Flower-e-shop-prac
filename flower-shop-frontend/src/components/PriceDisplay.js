/**
 * 价格展示组件
 *
 * 统一处理商品价格的三态显示：
 * - 有 sale_price：显示划掉的原价 + 红色促销价
 * - 仅有 price：直接显示价格
 * - 无价格：不渲染
 *
 * 替代原有在 5 个文件中重复书写的价格渲染逻辑。
 */
import React from 'react';

export default function PriceDisplay({ price, regular_price, sale_price }) {
  if (price == null || price === '') return null;

  return (
    <span className="product-price">
      {sale_price ? (
        <>
          <span className="regular-price">${regular_price}</span>
          <span className="sale-price">${sale_price}</span>
        </>
      ) : (
        `$${price}`
      )}
    </span>
  );
}
