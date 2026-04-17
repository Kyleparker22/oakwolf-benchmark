'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InternalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError('Invalid credentials. Please try again.'); setLoading(false); return; }
      router.push('/internal/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', border: '1.5px solid #E5E3DE', borderRadius: '10px',
    padding: '0.875rem 1rem', fontSize: '0.95rem', color: '#0F1F3D',
    fontFamily: 'DM Sans, sans-serif', outline: 'none', background: 'white',
    marginBottom: '0.75rem',
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F1F3D 0%, #1A3260 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #2563EB, #0D9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <img src="/oakwolf-logo.jpg" alt="Oakwolf Group" style={{ height: '50px', filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', letterSpacing: '0.05em', marginTop: '0.25rem' }}>INTERNAL PORTAL</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.25rem' }}>"Capable of being Strategic. Willing to be Tactical. Committed to being Practical."</p>
        </div>

        {/* Login card */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.75rem', color: '#0F1F3D', fontWeight: '400', marginBottom: '0.5rem' }}>Sign in</h1>
          <p style={{ color: '#6B6977', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Oakwolf team members only.</p>

          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Work Email</label>
          <input
            style={inp}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="you@oakwolfgroup.com"
          />

          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Password</label>
          <input
            style={{ ...inp, marginBottom: '0' }}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
          />

          {error && (
            <div style={{ color: '#DC2626', fontSize: '0.85rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', marginTop: '0.75rem', border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', marginTop: '1.25rem', padding: '1rem', background: loading ? '#93C5FD' : 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </div>
      </div>
    </main>
  );
}
