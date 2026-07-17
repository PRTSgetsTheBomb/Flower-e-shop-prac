import React from 'react';
import { render } from '@testing-library/react';
import PriceDisplay from '../PriceDisplay';

describe('PriceDisplay', () => {
  test('无 price 时不渲染', () => {
    const { container } = render(<PriceDisplay price={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('空字符串不渲染', () => {
    const { container } = render(<PriceDisplay price="" />);
    expect(container.firstChild).toBeNull();
  });

  test('仅有 price 显示 $29.99', () => {
    const { container } = render(<PriceDisplay price="29.99" />);
    expect(container.textContent).toBe('$29.99');
  });

  test('有 sale_price 时显示原价划线和促销价', () => {
    const { container } = render(
      <PriceDisplay price="29.99" regular_price="35.00" sale_price="29.99" />
    );
    expect(container.querySelector('.regular-price')).toBeTruthy();
    expect(container.querySelector('.sale-price')).toBeTruthy();
    expect(container.querySelector('.regular-price').textContent).toBe('$35.00');
    expect(container.querySelector('.sale-price').textContent).toBe('$29.99');
  });

  test('sale_price 为空字符串时不显示双价格', () => {
    const { container } = render(
      <PriceDisplay price="29.99" regular_price="35.00" sale_price="" />
    );
    expect(container.querySelector('.regular-price')).toBeFalsy();
    expect(container.textContent).toBe('$29.99');
  });
});
