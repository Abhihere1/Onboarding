'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface HeaderUser {
  username: string;
  email: string;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [incidentCount, setIncidentCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { username?: string; email?: string } | null) => {
        if (d) setUser({ username: d.username || '', email: d.email || '' });
      })
      .catch(() => null);

    fetch('/api/incidents')
      .then((r) => (r.ok ? r.json() : { incidents: [] }))
      .then((d: { incidents?: unknown[] }) => setIncidentCount(d.incidents?.length || 0))
      .catch(() => null);
  }, []);

  const handleNewChat = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('patch:newchat'));
    }
    if (pathname !== '/') {
      router.push('/');
    }
  }, [pathname, router]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }, [router]);

  const isActive = (path: string) => pathname === path;

  return (
    <header
      className="flex items-center justify-between px-6 shrink-0"
      style={{
        height: '60px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
      }}
      data-testid="app-header"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 no-underline" data-testid="header-logo-link">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: '#DC2626' }}
          data-testid="header-logo-icon"
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.3" />
            <path d="M16 4 L16 28 M4 16 L28 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-bold text-gray-900 text-base" data-testid="header-app-name">
          Patch
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-1" data-testid="header-nav">
        <Link
          href="/incidents"
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors no-underline"
          style={{ color: isActive('/incidents') ? '#DC2626' : '#374151' }}
          data-testid="nav-incidents-link"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
          Incidents
          {incidentCount > 0 && (
            <span
              className="text-white text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: '#DC2626', fontSize: '10px', lineHeight: '1' }}
              data-testid="incidents-count-badge"
            >
              {incidentCount}
            </span>
          )}
          {isActive('/incidents') && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: '#DC2626' }}
            />
          )}
        </Link>

        <button
          onClick={handleNewChat}
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
          style={{ color: pathname === '/' ? '#DC2626' : '#374151', background: 'none', border: 'none', cursor: 'pointer' }}
          data-testid="nav-new-chat-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <path d="M12 8v4M10 10h4" />
          </svg>
          New Chat
          {pathname === '/' && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: '#DC2626' }}
            />
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          data-testid="nav-logout-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {user ? user.username || user.email.split('@')[0] : 'Logout'}
        </button>
      </nav>
    </header>
  );
}
