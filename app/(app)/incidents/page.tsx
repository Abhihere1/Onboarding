'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Incident } from '@/lib/types';

type FilterStatus = 'All' | 'Open' | 'Escalated' | 'Resolved';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Open: { bg: '#FEF9C3', color: '#854D0E' },
    Escalated: { bg: '#FEE2E2', color: '#991B1B' },
    Resolved: { bg: '#D1FAE5', color: '#065F46' },
  };
  const s = styles[status] || styles.Open;
  return (
    <span
      className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
      data-testid={`badge-${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function IncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('All');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => { if (!r.ok) router.push('/login'); })
      .catch(() => router.push('/login'));

    fetch('/api/incidents')
      .then((r) => (r.ok ? r.json() : { incidents: [] }))
      .then((d: { incidents?: Incident[] }) => {
        setIncidents(d.incidents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const filters: FilterStatus[] = ['All', 'Open', 'Escalated', 'Resolved'];
  const filtered = filter === 'All' ? incidents : incidents.filter((i) => i.status === filter);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#F9FAFB' }}
      data-testid="incidents-page"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1" data-testid="incidents-heading">
            My Incidents
          </h1>
          <p className="text-sm text-gray-500">
            {incidents.length} total incident{incidents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: 'white', border: '1px solid #E5E7EB' }}
          data-testid="filter-tabs"
        >
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: filter === f ? '#DC2626' : 'transparent',
                color: filter === f ? 'white' : '#6B7280',
                border: 'none',
                cursor: 'pointer',
              }}
              data-testid={`filter-tab-${f.toLowerCase()}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          data-testid="incidents-table"
        >
          {loading ? (
            <div className="flex justify-center py-12 text-sm text-gray-400" data-testid="incidents-loading">
              Loading incidents…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12" data-testid="incidents-empty">
              <p className="text-gray-400 text-sm">No incidents yet.</p>
              <Link
                href="/"
                className="mt-3 inline-block text-sm font-semibold"
                style={{ color: '#DC2626' }}
                data-testid="start-chat-link"
              >
                Start a new conversation →
              </Link>
            </div>
          ) : (
            <table className="w-full" data-testid="incidents-list">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    ID
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Category
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Created
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Age
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc, idx) => (
                  <tr
                    key={inc.incidentId}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                    data-testid={`incident-row-${inc.incidentId}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-gray-500" data-testid="row-incident-id">
                        {inc.incidentId}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-gray-700" data-testid="row-category">
                        {inc.category ? inc.category.toUpperCase() : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-500" data-testid="row-created">
                        {new Date(inc.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-400" data-testid="row-age">
                        {timeAgo(inc.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/incidents/${inc.incidentId}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: '#FEF2F2', color: '#DC2626', textDecoration: 'none' }}
                        data-testid={`view-incident-btn-${inc.incidentId}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
