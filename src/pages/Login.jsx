import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CORAL = '#E8967A';
const TEAL  = '#8ECFCA';
const DARK  = '#1A1A1A';

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]           = useState('login'); // 'login' | 'setup'
  const [checkingSetup, setCS]    = useState(true);
  const [form, setForm]           = useState({ name: '', email: '', password: '' });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) { navigate('/'); return; }
    api.get('/auth/setup-needed')
      .then(r => { if (r.setupNeeded) setMode('setup'); })
      .catch(() => {})
      .finally(() => setCS(false));
  }, [isAuthenticated, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        const r = await api.post('/auth/setup', { name: form.name, email: form.email, password: form.password });
        if (!r.success) { setError(r.message); return; }
        setMode('login');
        setForm(f => ({ ...f, name: '' }));
        return;
      }
      const r = await api.post('/auth/login', { email: form.email, password: form.password });
      if (!r.success) { setError(r.message); return; }
      login(r.data);
      navigate('/');
    } catch {
      setError('Could not connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: TEAL, fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ color: CORAL, fontSize: 32, fontWeight: 700, margin: 0, fontFamily: 'serif' }}>Fundzola</h1>
          <p style={{ color: TEAL, fontSize: 11, margin: '4px 0 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>by EdZola</p>
        </div>

        {/* Card */}
        <div style={{ background: '#242424', borderRadius: 12, padding: 32, border: '1px solid #333' }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>
            {mode === 'setup' ? 'Set up your account' : 'Sign in'}
          </h2>
          <p style={{ color: '#777', fontSize: 12, margin: '0 0 24px' }}>
            {mode === 'setup' ? 'Create the admin account to get started.' : 'Welcome back to Fundzola.'}
          </p>

          {error && (
            <div style={{ background: '#3a1a1a', border: '1px solid #c0392b', color: '#e74c3c', borderRadius: 6, padding: '10px 14px', fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'setup' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name</span>
                <input
                  type="text" required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Your name"
                  style={inputStyle}
                />
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</span>
              <input
                type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#aaa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} required value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#777', lineHeight: 1 }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>
            <button
              type="submit" disabled={loading}
              style={{ background: CORAL, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 6 }}
            >
              {loading ? 'Please wait…' : mode === 'setup' ? 'Create Admin Account' : 'Sign In'}
            </button>
          </form>

          {mode === 'setup' && (
            <p style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: 11 }}>Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: '#1a1a1a',
  border: '1px solid #3a3a3a',
  borderRadius: 6,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
