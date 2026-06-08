'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const { user, login, register, loading } = useAuth();
  const router = useRouter();

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER'); // Default role: USER

  const [formLoading, setFormLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    // Auto clear alert
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setAlert(null);

    if (isLoginTab) {
      // Login Flow
      if (!email || !password) {
        triggerAlert('error', 'Please fill in all fields.');
        setFormLoading(false);
        return;
      }

      const res = await login(email, password);
      if (res.success) {
        // Redirecting is handled inside context
      } else {
        triggerAlert('error', res.error?.message || 'Login failed. Please check credentials.');
        setFormLoading(false);
      }
    } else {
      // Register Flow
      if (!name || !email || !password) {
        triggerAlert('error', 'Please fill in all fields.');
        setFormLoading(false);
        return;
      }
      if (password.length < 6) {
        triggerAlert('error', 'Password must be at least 6 characters.');
        setFormLoading(false);
        return;
      }

      const res = await register(name, email, password, role);
      if (res.success) {
        triggerAlert('success', 'Registration successful! Switching to login...');
        setName('');
        setEmail(res.data?.email || email);
        setPassword('');
        setRole('USER');
        // Auto toggle tab
        setTimeout(() => {
          setIsLoginTab(true);
        }, 1500);
      } else {
        triggerAlert('error', res.error?.message || 'Registration failed.');
      }
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: '1.2rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span>Loading secure workspace...</span>
        </div>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Visual background rings */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'var(--primary)',
        filter: 'blur(150px)',
        opacity: 0.15,
        zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'var(--secondary)',
        filter: 'blur(160px)',
        opacity: 0.1,
        zIndex: -1
      }}></div>

      <div className="glass" style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.6rem',
            marginBottom: '15px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
          }}>
            T
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>TaskFlow Workspace</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Secure, scalable project administration
          </p>
        </div>

        {/* Alerts */}
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            <span>{alert.message}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          background: 'rgba(17, 24, 39, 0.5)',
          padding: '6px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '30px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => { setIsLoginTab(true); setAlert(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: isLoginTab ? 'var(--primary)' : 'transparent',
              color: isLoginTab ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-heading)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setAlert(null); }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: !isLoginTab ? 'var(--primary)' : 'transparent',
              color: !isLoginTab ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-heading)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Register
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit}>
          {!isLoginTab && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              placeholder="developer@example.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: '25px' }}>
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLoginTab && (
            <div className="input-group" style={{ marginBottom: '30px' }}>
              <label className="input-label">Select System Role</label>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => setRole('USER')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: role === 'USER' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: role === 'USER' ? 'var(--primary)' : 'var(--text-muted)',
                    border: `1px solid ${role === 'USER' ? 'var(--primary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '600',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  Regular User
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: role === 'ADMIN' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: role === 'ADMIN' ? 'var(--secondary)' : 'var(--text-muted)',
                    border: `1px solid ${role === 'ADMIN' ? 'var(--secondary)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: '600',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  Admin User
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
                {role === 'ADMIN' 
                  ? '⚠️ Admins can see all users, view/edit any task, and assign tasks to other developers.' 
                  : 'Regular Users can create, edit, view, and complete tasks assigned to themselves.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 0', fontSize: '1rem' }}
            disabled={formLoading}
          >
            {formLoading ? 'Authenticating...' : isLoginTab ? 'Access Dashboard' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
