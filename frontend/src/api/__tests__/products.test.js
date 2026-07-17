import { toNameSlug, mapProduct, mapProductWP } from '../products';

describe('toNameSlug', () => {
  test('基本转换', () => {
    expect(toNameSlug('Red Rose')).toBe('red-rose');
  });

  test('移除撇号', () => {
    expect(toNameSlug("Baby's Breath")).toBe('babys-breath');
  });

  test('多个空格替换为一个连字符', () => {
    expect(toNameSlug('Red   Rose  Bouquet')).toBe('red-rose-bouquet');
  });

  test('首尾连字符去除', () => {
    expect(toNameSlug('  Hello World!!  ')).toBe('hello-world');
  });

  test('空字符串', () => {
    expect(toNameSlug('')).toBe('');
  });

  test('null 输入', () => {
    expect(toNameSlug(null)).toBe('');
  });
});

describe('mapProduct', () => {
  test('WooCommerce 数据正确映射', () => {
    const input = {
      id: 42,
      name: 'Red Rose',
      slug: 'red-rose',
      price: '29.99',
      regular_price: '35.00',
      sale_price: '29.99',
      stock_status: 'instock',
      date_created: '2026-01-01',
      images: [{ src: 'http://img/rose.jpg' }],
      description: '',
    };
    const result = mapProduct(input);
    expect(result.id).toBe(42);
    expect(result.name).toBe('Red Rose');
    expect(result.slug).toBe('red-rose');
    expect(result.nameSlug).toBe('red-rose');
    expect(result.price).toBe('29.99');
    expect(result.sale_price).toBe('29.99');
    expect(result.image).toBe('http://img/rose.jpg');
  });

  test('无图片时从 HTML 描述提取', () => {
    const input = {
      id: 1, name: 'Tulip', slug: 'tulip',
      price: '15', regular_price: '', sale_price: '',
      stock_status: 'instock', date_created: null,
      images: [],
      description: '<img src="http://img/tulip.jpg" />',
    };
    const result = mapProduct(input);
    expect(result.image).toBe('http://img/tulip.jpg');
  });

  test('完全无图片时返回 null', () => {
    const input = {
      id: 1, name: 'No Image', slug: 'no-image',
      price: '10', regular_price: '', sale_price: '',
      stock_status: 'instock', date_created: null,
      images: [], description: '',
    };
    expect(mapProduct(input).image).toBeNull();
  });
});

describe('mapProductWP', () => {
  test('WordPress 数据正确映射', () => {
    const input = {
      id: 99,
      title: { rendered: 'Sunflower' },
      slug: 'sunflower',
      content: { rendered: '<img src="http://img/sun.jpg" />' },
      date: '2026-03-15',
    };
    const result = mapProductWP(input);
    expect(result.id).toBe(99);
    expect(result.name).toBe('Sunflower');
    expect(result.nameSlug).toBe('sunflower');
    expect(result.price).toBeNull();
    expect(result.sale_price).toBeNull();
    expect(result.image).toBe('http://img/sun.jpg');
  });
});
