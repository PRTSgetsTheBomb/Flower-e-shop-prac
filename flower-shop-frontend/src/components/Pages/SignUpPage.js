/**
 * 注册页面
 * 
 * 当前使用 localStorage 本地存储注册信息（见 AuthContext.js）
 * 对接真实后端后只需替换 AuthContext 中的 saveAccount / authenticate 实现
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FadeInUp from '../Generic/FadeInUp';
import { useAuth } from '../../context/AuthContext';
import '../../PageStyles/AccountPage.css';

function SignUpPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    const result = await register(name, email, password);
    if (result.success) {
      navigate('/account');
    } else {
      setError(result.error);
    }
  };

  return (
    <FadeInUp as="section" className="account-page">
      <div className="container">
        <div className="account-card">
          <h1>Create Account</h1>
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-wrapper">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="account-footer">
            Already have an account? <Link to="/account">Sign in</Link>
          </p>
        </div>
      </div>
    </FadeInUp>
  )
}

export default SignUpPage;