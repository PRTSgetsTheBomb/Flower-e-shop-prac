/**
 * 认证上下文 - AuthContext
 * 
 * 当前实现：
 *   - 注册信息存储在 localStorage 中（键名: 'registered_accounts'）
 *   - 登录状态存储在 localStorage 中（键名: 'current_user'）
 *   - 密码以明文存储，仅用于本地演示
 * 
 * 后续对接真实后端 API 需要替换：
 *   1. saveAccount()   → 调用注册接口 POST /api/register
 *   2. authenticate()   → 调用登录接口 POST /api/login
 *   3. 登录成功后保存后端返回的 token 而非本地数据
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext();
const ACCOUNTS_KEY = 'registered_accounts';

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAccount(name, email, password) {
  const accounts = getAccounts();
  if (accounts.find((a) => a.email === email)) {
    throw new Error('An account with this email already exists.');
  }
  const newAccount = { name, email, password };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, newAccount]));
  return { name, email };
}

function authenticate(email, password) {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email === email);
  if (!account || account.password !== password) {
    throw new Error('Invalid email or password.');
  }
  return { name: account.name, email: account.email };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      const userData = saveAccount(name, email, password);
      localStorage.setItem('current_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const userData = authenticate(email, password);
      localStorage.setItem('current_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('current_user');
    setUser(null);
  }, []);

  // 更新用户信息（当前仅支持修改名称，扩展时可添加更多字段）
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const newUser = { ...user, ...updates };
    // 同步更新 registered_accounts 中的数据
    const accounts = getAccounts();
    const updatedAccounts = accounts.map((a) =>
      a.email === user.email ? { ...a, ...updates } : a
    );
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  // 添加地址
  const addAddress = useCallback(async (address) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const currentAddresses = user.addresses || [];
    const newAddress = { ...address, id: Date.now().toString() };
    const newUser = { ...user, addresses: [...currentAddresses, newAddress] };
    const accounts = getAccounts();
    const updatedAccounts = accounts.map((a) =>
      a.email === user.email ? { ...a, addresses: [...(a.addresses || []), newAddress] } : a
    );
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  // 删除地址
  const removeAddress = useCallback(async (addressId) => {
    if (!user) return { success: false, error: 'Not logged in.' };
    const currentAddresses = user.addresses || [];
    const newAddresses = currentAddresses.filter((a) => a.id !== addressId);
    const newUser = { ...user, addresses: newAddresses };
    const accounts = getAccounts();
    const updatedAccounts = accounts.map((a) =>
      a.email === user.email ? { ...a, addresses: newAddresses } : a
    );
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
    localStorage.setItem('current_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, addAddress, removeAddress, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
