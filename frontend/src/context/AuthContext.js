/**
 * 认证上下文 - AuthContext
 *
 * 认证方式：JWT Authentication for WP REST API
 * 注册：通过后端 Express 服务代理到 WooCommerce API
 * 登录：直接调用 WordPress JWT 端点
 *
 * 存储：
 *   - jwt_token     — JWT Token
 *   - current_user  — 用户信息
 *   - user_addresses — 地址簿（本地存储）
 *
 * 接口与原有实现保持一致，页面组件无需修改
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext();
const API_BASE = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const WP_BASE = process.env.REACT_APP_WC_URL || 'http://localhost:8080';

const ADDRESSES_KEY = 'user_addresses';

function getLocalAddresses(email) {
  try {
    const all = JSON.parse(localStorage.getItem(ADDRESSES_KEY)) || {};
    return all[email] || [];
  } catch {
    return [];
  }
}

function saveLocalAddress(email, address) {
  try {
    const all = JSON.parse(localStorage.getItem(ADDRESSES_KEY)) || {};
    const list = all[email] || [];
    all[email] = [...list, { ...address, id: Date.now().toString() }];
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(all));
    return all[email];
  } catch {
    return [];
  }
}

function removeLocalAddress(email, addressId) {
  try {
    const all = JSON.parse(localStorage.getItem(ADDRESSES_KEY)) || {};
    all[email] = (all[email] || []).filter((a) => a.id !== addressId);
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(all));
    return all[email];
  } catch {
    return [];
  }
}

function updateLocalAddress(email, addressId, updates) {
  try {
    const all = JSON.parse(localStorage.getItem(ADDRESSES_KEY)) || {};
    all[email] = (all[email] || []).map((a) =>
      a.id === addressId ? { ...a, ...updates } : a
    );
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(all));
    return all[email];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // ---------- 登录（JWT） ----------
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${WP_BASE}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message?.replace(/<[^>]+>/g, '') || 'Invalid email or password.';
        return { success: false, error: msg };
      }

      const nameParts = (data.user_display_name || email).split(' ');
      const userData = {
        token: data.token,
        email: data.user_email,
        name: data.user_display_name,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
      };

      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('current_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- 注册（通过后端代理到 WooCommerce） ----------
  const register = useCallback(async (firstName, lastName, email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      // 注册成功后自动登录（获取 JWT token）
      const loginRes = await fetch(`${WP_BASE}/wp-json/jwt-auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        const userData = {
          ...data.user,
          token: loginData.token,
        };
        localStorage.setItem('jwt_token', loginData.token);
        localStorage.setItem('current_user', JSON.stringify(userData));
        setUser(userData);
      } else {
        localStorage.setItem('current_user', JSON.stringify(data.user));
        setUser(data.user);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- 登出 ----------
  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user');
    setUser(null);
  }, []);

  // ---------- 更新资料 ----------
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { success: false, error: 'Not logged in.' };

    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/api/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, ...updates }),
        });
      } catch {
        // 服务端更新失败不影响本地更新
      }
    }

    const newUser = { ...user, ...updates };
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  // ---------- 添加地址 ----------
  const addAddress = useCallback(async (address) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const updatedList = saveLocalAddress(user.email, address);
    const newUser = { ...user, addresses: updatedList };
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  // ---------- 删除地址 ----------
  const removeAddress = useCallback(async (addressId) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const updatedList = removeLocalAddress(user.email, addressId);
    const newUser = { ...user, addresses: updatedList };
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  // ---------- 更新地址 ----------
  const updateAddress = useCallback(async (addressId, updates) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const updatedList = updateLocalAddress(user.email, addressId, updates);
    const newUser = { ...user, addresses: updatedList };
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, addAddress, removeAddress, updateAddress, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** 获取当前 JWT token（供其他模块使用） */
export function getToken() {
  return localStorage.getItem('jwt_token');
}
