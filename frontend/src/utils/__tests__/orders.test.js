import { addOrder, getUserOrders, getOrderById } from '../orders';

beforeEach(() => {
  localStorage.clear();
});

describe('orders', () => {
  test('addOrder 保存并返回订单', () => {
    const order = addOrder(
      'test@example.com',
      [{ id: 1, name: 'Rose', qty: 2, price: '29.99' }],
      59.98,
      { address: '123 Main St', suburb: 'Melbourne CBD', postcode: '3000' }
    );
    expect(order.id).toMatch(/^ORD-/);
    expect(order.total).toBe(59.98);
    expect(order.items).toHaveLength(1);
    expect(order.status).toBe('On Hold');
  });

  test('getUserOrders 按邮箱分组', () => {
    addOrder('a@test.com', [], 10, {});
    addOrder('a@test.com', [], 20, {});
    addOrder('b@test.com', [], 30, {});

    expect(getUserOrders('a@test.com')).toHaveLength(2);
    expect(getUserOrders('b@test.com')).toHaveLength(1);
    expect(getUserOrders('c@test.com')).toEqual([]);
  });

  test('getOrderById 返回正确订单', () => {
    const created = addOrder('user@test.com', [], 100, {});
    const found = getOrderById('user@test.com', created.id);
    expect(found).toBeTruthy();
    expect(found.total).toBe(100);
  });

  test('getOrderById 不存在返回 null', () => {
    expect(getOrderById('x@test.com', 'NONEXISTENT')).toBeNull();
  });
});