'use client';

import Link from 'next/link';
import { Incident } from '@/lib/types';

interface Props {
  incident: Incident;
  type: 'escalation' | 'resolution';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Open: { bg: '#FEF9C3', color: '#854D0E' },
    Escalated: { bg: '#FEE2E2', color: '#991B1B' },
    Resolved: { bg: '#D1FAE5', color: '#065F46' },
  };
  const s = styles[status] || styles.Open;
  return (
    <span
      className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded"
      style={{ background: s.bg, color: s.color }}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
}

export default function SummaryCard({ incident, type }: Props) {
  const details = type === 'escalation' ? incident.escalationDetails : null;
  const isResolved = type === 'resolution';

  return (
    <div
      className="rounded-xl p-5 mt-2"
      style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      data-testid="summary-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
            {isResolved ? 'Resolution Record' : 'Escalation Record'}
          </p>
          <p className="font-bold text-gray-900 text-sm" data-testid="summary-incident-id">
            {incident.incidentId}
          </p>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Category</p>
          <p className="text-sm font-medium text-gray-800" data-testid="summary-category">
            {incident.category || 'General IT'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created For</p>
          <p className="text-sm font-medium text-gray-800" data-testid="summary-created-for">
            {details?.createdFor || 'Associate'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
          <p className="text-sm font-medium text-gray-800" data-testid="summary-date">
            {new Date(incident.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
          <p className="text-sm font-medium text-gray-800" data-testid="summary-status">
            {incident.status}
          </p>
        </div>

        {details && (
          <>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Priority</p>
              <p className="text-sm font-medium text-gray-800" data-testid="summary-priority">
                {details.priority || 'Medium'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Urgency</p>
              <p className="text-sm font-medium text-gray-800" data-testid="summary-urgency">
                {details.urgency || 'Medium'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Impact</p>
              <p className="text-sm font-medium text-gray-800" data-testid="summary-impact">
                {details.impact || 'Individual'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Support Group</p>
              <p className="text-sm font-medium text-gray-800" data-testid="summary-support-group">
                {details.supportGroup || 'IT Support'}
              </p>
            </div>
          </>
        )}
      </div>

      {details?.reason && (
        <div className="mb-4 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reason</p>
          <p className="text-sm text-gray-700" data-testid="summary-reason">
            {details.reason}
          </p>
        </div>
      )}

      {details?.description && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700" data-testid="summary-description">
            {details.description}
          </p>
        </div>
      )}

      <div className="pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
        <Link
          href={`/incidents/${incident.incidentId}`}
          className="text-sm font-semibold"
          style={{ color: '#DC2626' }}
          data-testid="summary-view-incident-link"
        >
          View Incident →
        </Link>
      </div>
    </div>
  );
}
