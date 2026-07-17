import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import React from 'react';

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
});

function wrapper({ children }) {
  return React.createElement(AuthProvider, null, children);
}

describe('AuthContext', () => {
  test('初始状态未登录', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('登录成功后 user 和 token 更新', async () => {
    // login 直接调 WordPress JWT 端点
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'fake-jwt-xxx',
        user_email: 'test@test.com',
        user_display_name: 'Test User',
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@test.com', 'password123');
    });

    expect(result.current.user.name).toBe('Test User');
    expect(result.current.user.email).toBe('test@test.com');
    expect(localStorage.getItem('jwt_token')).toBe('fake-jwt-xxx');
  });

  test('登录失败返回 error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '密码不正确' }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let res;
    await act(async () => {
      res = await result.current.login('test@test.com', 'wrong');
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('密码不正确');
    expect(result.current.user).toBeNull();
  });

  test('登出清除所有状态', async () => {
    // 先登录
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'xxx',
        user_email: 'test@test.com',
        user_display_name: 'Test',
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@test.com', 'pwd');
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });
});