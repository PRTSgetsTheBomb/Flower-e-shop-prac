import { cartReducer } from '../CartContext';

describe('cartReducer', () => {
  const baseItem = {
    id: 1, name: 'Red Rose', price: '29.99', sale_price: '',
    image: '', deliveryMethod: 'pickup', cartKey: '1_pickup',
  };

  test('ADD 新商品到空购物车', () => {
    const next = cartReducer([], { type: 'ADD', product: { ...baseItem, qty: 1 } });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(1);
  });

  test('ADD 已存在商品则累加 qty', () => {
    const state = [{ ...baseItem, qty: 2 }];
    const next = cartReducer(state, { type: 'ADD', product: { ...baseItem, qty: 1 } });
    expect(next).toHaveLength(1);
    expect(next[0].qty).toBe(3);
  });

  test('ADD 同商品不同配送方式视为两个条目', () => {
    const state = [{ ...baseItem, qty: 1 }];
    const del = { ...baseItem, deliveryMethod: 'delivery', cartKey: '1_delivery' };
    const next = cartReducer(state, { type: 'ADD', product: { ...del, qty: 1 } });
    expect(next).toHaveLength(2);
  });

  test('REMOVE 只移除指定 cartKey', () => {
    const state = [
      { ...baseItem, cartKey: '1_pickup' },
      { ...baseItem, id: 2, cartKey: '2_pickup' },
    ];
    const next = cartReducer(state, { type: 'REMOVE', cartKey: '1_pickup' });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(2);
  });

  test('UPDATE_QTY 不允许小于 1', () => {
    const state = [{ ...baseItem, qty: 3 }];
    expect(cartReducer(state, { type: 'UPDATE_QTY', cartKey: '1_pickup', qty: 0 })[0].qty).toBe(1);
    expect(cartReducer(state, { type: 'UPDATE_QTY', cartKey: '1_pickup', qty: -5 })[0].qty).toBe(1);
  });

  test('UPDATE_DELIVERY_METHOD 更新 cartKey', () => {
    const state = [{ ...baseItem, deliveryMethod: 'pickup', cartKey: '1_pickup' }];
    const next = cartReducer(state, { type: 'UPDATE_DELIVERY_METHOD', cartKey: '1_pickup', method: 'delivery' });
    expect(next[0].deliveryMethod).toBe('delivery');
    expect(next[0].cartKey).toBe('1_delivery');
  });

  test('CLEAR 清空', () => {
    const next = cartReducer([{ ...baseItem }, { ...baseItem, id: 2 }], { type: 'CLEAR' });
    expect(next).toEqual([]);
  });

  test('未知 action 返回原引用不变', () => {
    const state = [{ ...baseItem }];
    expect(cartReducer(state, { type: 'UNKNOWN' })).toBe(state);
  });
});