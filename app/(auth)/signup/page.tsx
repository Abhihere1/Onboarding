'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Signup failed.');
      } else {
        router.push('/login?success=' + encodeURIComponent('Account created! Sign in to continue.'));
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" data-testid="signup-page">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at 60% 40%, #fce7e7 0%, #fdf6f0 40%, #faf8f5 70%, #f5f0ee 100%)',
        }}
        data-testid="signup-brand-panel"
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 28px, #000 28px, #000 30px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 28px, #000 28px, #000 30px
            )`,
          }}
        />
        <div className="relative z-10 max-w-md text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg"
            style={{ background: '#DC2626' }}
            data-testid="signup-brand-logo"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.3" />
              <path d="M16 4 L16 28 M4 16 L28 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4" data-testid="signup-eyebrow">
            Discount Tire Information Center
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight" data-testid="signup-heading">
            IT support, resolved faster.
          </h1>
          <p className="text-gray-500 leading-relaxed" data-testid="signup-copy">
            Create your Patch account to start getting guided IT support. Available to all Discount Tire associates.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
        data-testid="signup-form-panel"
      >
        <div className="w-full max-w-sm" data-testid="signup-card">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1" data-testid="signup-form-heading">
              Create your account
            </h2>
            <p className="text-sm text-gray-500">Join Patch to get self-service IT support.</p>
          </div>

          <form onSubmit={handleSubmit} data-testid="signup-form">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-username">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all"
                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                placeholder="Your name"
                data-testid="signup-username-input"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all"
                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                placeholder="you@discounttire.com"
                data-testid="signup-email-input"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all"
                style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                placeholder="Min. 6 characters"
                data-testid="signup-password-input"
              />
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600" data-testid="signup-error-msg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
              style={{
                background: loading ? '#F87171' : '#DC2626',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              data-testid="signup-submit-btn"
            >
              {loading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium"
              style={{ color: '#DC2626' }}
              data-testid="signup-login-link"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
