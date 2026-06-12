'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FeedbackCard from '@/components/FeedbackCard';
import { Incident, Feedback } from '@/lib/types';

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
      data-testid="detail-status-badge"
    >
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-0.5 rounded transition-all"
      style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', cursor: 'pointer' }}
      data-testid="copy-btn"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ProgressTimeline({ status }: { status: string }) {
  const steps = ['Open', 'Escalated', 'Resolved'];
  const activeIdx = status === 'Open' ? 0 : status === 'Escalated' ? 1 : 2;

  return (
    <div className="flex items-center gap-0" data-testid="progress-timeline">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: i <= activeIdx ? '#DC2626' : 'transparent',
                border: `2px solid ${i <= activeIdx ? '#DC2626' : '#D1D5DB'}`,
                color: i <= activeIdx ? 'white' : '#D1D5DB',
              }}
              data-testid={`timeline-step-${step.toLowerCase()}`}
            >
              {i <= activeIdx ? '✓' : ''}
            </div>
            <span
              className="text-xs font-medium mt-1"
              style={{ color: i <= activeIdx ? '#DC2626' : '#9CA3AF' }}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-0.5 mb-4"
              style={{ background: i < activeIdx ? '#DC2626' : '#E5E7EB' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => { if (!r.ok) router.push('/login'); })
      .catch(() => router.push('/login'));

    fetch(`/api/incidents/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { incident?: Incident } | null) => {
        if (d?.incident) {
          setIncident(d.incident);
          setFeedback(d.incident.feedback);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  function handleResumeChat() {
    sessionStorage.setItem('resume_incident_id', id);
    router.push('/');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-sm text-gray-400" data-testid="detail-loading">
        Loading incident…
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" data-testid="detail-not-found">
        <p className="text-gray-500">Incident not found.</p>
        <Link href="/incidents" style={{ color: '#DC2626', fontSize: '14px' }} data-testid="back-to-incidents">
          ← Back to Incidents
        </Link>
      </div>
    );
  }

  const canResume = incident.status === 'Open';
  const details = incident.status === 'Escalated' ? incident.escalationDetails : incident.resolutionDetails;

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F9FAFB' }} data-testid="incident-detail-page">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6" data-testid="detail-header">
          <div className="flex items-center gap-3">
            <Link
              href="/incidents"
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: '#6B7280', textDecoration: 'none' }}
              data-testid="back-link"
            >
              ← Incidents
            </Link>
            <span className="text-gray-300">/</span>
            <StatusBadge status={incident.status} />
          </div>
          {canResume && (
            <button
              onClick={handleResumeChat}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: '#DC2626', border: 'none', cursor: 'pointer' }}
              data-testid="resume-chat-btn"
            >
              Resume Chat
            </button>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-6" data-testid="detail-title">
          Incident {incident.incidentId}
        </h1>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column (70%) */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Conversation Card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              data-testid="conversation-card"
            >
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
                <h2 className="font-semibold text-gray-900 text-sm">Conversation History</h2>
              </div>
              <div
                className="p-5 overflow-y-auto flex flex-col gap-3"
                style={{ maxHeight: '520px' }}
                data-testid="conversation-history"
              >
                {incident.history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No messages yet.</p>
                ) : (
                  incident.history.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2'}`}
                      data-testid={`history-msg-${i}`}
                    >
                      {msg.role === 'assistant' && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: '#DC2626' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5" />
                            <path d="M16 4 L16 28 M4 16 L28 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-sm px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          msg.role === 'user' ? '' : ''
                        }`}
                        style={
                          msg.role === 'user'
                            ? { background: '#DC2626', color: 'white', borderRadius: '12px 12px 4px 12px' }
                            : { background: 'white', border: '1px solid #E5E7EB', borderLeft: '2px solid #DC2626', borderRadius: '4px 12px 12px 12px' }
                        }
                      >
                        {msg.role === 'assistant' ? (
                          <div className="markdown-content" style={{ fontSize: '13px' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                        {msg.controls && (
                          <div className="mt-1.5 flex flex-wrap gap-1" data-testid="history-controls">
                            {msg.controls.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className="text-xs px-2 py-0.5 rounded"
                                style={
                                  msg.controls?.isCompleted
                                    ? { background: '#F3F4F6', color: '#9CA3AF' }
                                    : { background: '#FEF2F2', color: '#DC2626' }
                                }
                                data-testid={`history-option-${oi}`}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs opacity-50 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Progress Timeline */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              data-testid="progress-card"
            >
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Progress</h2>
              <ProgressTimeline status={incident.status} />
            </div>

            {/* Status Details + Feedback */}
            {(details || incident.status !== 'Open') && (
              <div
                className="rounded-2xl"
                style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                data-testid="status-details-card"
              >
                <div className="px-5 pt-5 pb-4">
                  <h2 className="font-semibold text-gray-900 text-sm mb-4">
                    {incident.status === 'Escalated' ? 'Escalation Details' : 'Resolution Details'}
                  </h2>

                  {incident.escalationDetails && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm" data-testid="escalation-details">
                      {[
                        ['Priority', incident.escalationDetails.priority],
                        ['Urgency', incident.escalationDetails.urgency],
                        ['Impact', incident.escalationDetails.impact],
                        ['Support Group', incident.escalationDetails.supportGroup],
                        ['Created For', incident.escalationDetails.createdFor],
                      ].map(([label, val]) => val && (
                        <div key={label}>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="font-medium text-gray-800 mt-0.5">{val}</p>
                        </div>
                      ))}
                      {incident.escalationDetails.reason && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Reason</p>
                          <p className="font-medium text-gray-800 mt-0.5">{incident.escalationDetails.reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {incident.resolutionDetails && (
                    <div data-testid="resolution-details">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Summary</p>
                      <p className="text-sm text-gray-700">{incident.resolutionDetails.summary}</p>
                    </div>
                  )}
                </div>

                {/* Feedback section */}
                {incident.status !== 'Open' && (
                  <div style={{ borderTop: '1px solid #F3F4F6' }} data-testid="feedback-section">
                    <div className="px-5 pb-5">
                      <FeedbackCard
                        incidentId={incident.incidentId}
                        existing={feedback}
                        onSubmitted={(fb) => setFeedback(fb)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column (30%) */}
          <div className="flex flex-col gap-5">

            {/* Case Details */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              data-testid="case-details-card"
            >
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Case Details</h2>
              <div className="flex flex-col gap-3">
                {[
                  ['Status', incident.status],
                  ['Category', incident.category || '—'],
                  ['Type', 'IT Support'],
                  ['Priority', incident.escalationDetails?.priority || '—'],
                  ['Urgency', incident.escalationDetails?.urgency || '—'],
                  ['Impact', incident.escalationDetails?.impact || '—'],
                  [
                    'Created',
                    new Date(incident.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  ],
                  [
                    'Updated',
                    new Date(incident.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  ],
                ].map(([label, val]) => (
                  <div key={label} data-testid={`case-detail-${String(label).toLowerCase().replace(' ', '-')}`}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Identifiers */}
            <div
              className="rounded-2xl p-5"
              style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              data-testid="identifiers-card"
            >
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Identifiers</h2>
              <div className="flex flex-col gap-3">
                <div data-testid="incident-id-field">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Incident ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-700 flex-1 truncate">
                      {incident.incidentId}
                    </code>
                    <CopyButton text={incident.incidentId} />
                  </div>
                </div>
                <div data-testid="session-id-field">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Session ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-700 flex-1 truncate">
                      {String(incident._id).substring(0, 16)}…
                    </code>
                    <CopyButton text={String(incident._id)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {canResume && (
              <button
                onClick={handleResumeChat}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#DC2626', border: 'none', cursor: 'pointer' }}
                data-testid="detail-resume-btn"
              >
                Resume Chat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
