'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, signup } from '@/app/actions/auth';

const FT = 'var(--font-inter-tight), sans-serif';
const FI = 'var(--font-inter), sans-serif';
const FM = 'var(--font-jetbrains), monospace';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    start(async () => {
      const res = mode === 'signup'
        ? await signup({ email, password, name })
        : await login({ email, password });
      if (res.ok) {
        router.replace('/');
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    height: 46, width: '100%', padding: '0 14px', border: '1px solid #CFCCC3',
    borderRadius: 2, background: '#FAF9F5', fontFamily: FI, fontSize: 15, color: '#141413',
  };
  const label: React.CSSProperties = { fontFamily: FM, fontSize: 10, letterSpacing: '.14em', color: '#6B6B66' };

  return (
    <div style={{ minHeight: '100dvh', background: '#EFEDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FI }}>
      <div style={{ width: 'min(100%,360px)', background: '#FAF9F5', border: '1px solid #E5E3DC', borderRadius: 16, boxShadow: '0 30px 60px rgba(20,20,19,.12)', padding: '30px 24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
          <span style={{ fontFamily: FT, fontWeight: 600, fontSize: 22, letterSpacing: '-.02em' }}>R2</span>
          <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.22em', color: '#6B6B66' }}>· FINANCE</span>
        </div>
        <div style={{ fontFamily: FT, fontWeight: 500, fontSize: 24, letterSpacing: '-.01em', marginBottom: 22 }}>
          {mode === 'signup' ? 'Create account' : 'Welcome back'}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={label}>NAME (OPTIONAL)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={inputStyle} />
            </label>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={label}>EMAIL</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={label}>PASSWORD</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required style={inputStyle} />
          </label>

          {error && <div style={{ fontFamily: FM, fontSize: 11, color: '#A8362B', letterSpacing: '.02em' }}>{error}</div>}

          <button type="submit" disabled={pending} style={{ marginTop: 4, height: 48, width: '100%', borderRadius: 2, background: pending ? '#6B6B66' : '#141413', border: 'none', color: '#FAF9F5', fontFamily: FT, fontWeight: 500, fontSize: 16, letterSpacing: '.01em', cursor: pending ? 'default' : 'pointer' }}>
            {pending ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', fontFamily: FM, fontSize: 11, letterSpacing: '.04em', color: '#6B6B66' }}>
          {mode === 'signup' ? (
            <>Already have an account? <Link href="/login" style={{ color: '#0047FF', textDecoration: 'none' }}>Log in</Link></>
          ) : (
            <>New here? <Link href="/signup" style={{ color: '#0047FF', textDecoration: 'none' }}>Create an account</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
