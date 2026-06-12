'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MessageBubble, { TypingIndicator } from '@/components/MessageBubble';
import DynamicControls from '@/components/DynamicControls';
import FeedbackCard from '@/components/FeedbackCard';
import SummaryCard from '@/components/SummaryCard';
import Header from '@/components/Header';
import { Message, Controls, Incident, Feedback } from '@/lib/types';

interface User {
  userId: string;
  email: string;
  username: string;
}

interface ChatApiResponse {
  incidentId: string;
  status: string;
  response: string;
  controls?: Controls | null;
  should_escalate: boolean;
  should_resolve: boolean;
  escalation_data?: Record<string, unknown> | null;
  category?: string;
  incident?: Incident;
  error?: string;
}

type AppState = 'pre-chat' | 'active-chat';

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
      data-testid="incident-status-badge"
    >
      {status}
    </span>
  );
}

export default function MainPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>('pre-chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [incidentStatus, setIncidentStatus] = useState<string>('Open');
  const [incidentCategory, setIncidentCategory] = useState<string>('');
  const [activeControls, setActiveControls] = useState<Controls | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [kbAvailable, setKbAvailable] = useState(false);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<Feedback | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  function resetChat() {
    setMessages([]);
    setIncidentId(null);
    setIncidentStatus('Open');
    setIncidentCategory('');
    setActiveControls(null);
    setIsTyping(false);
    setInput('');
    setAppState('pre-chat');
    setActiveIncident(null);
    setActiveFeedback(undefined);
  }

  async function fetchAndResumeIncident(id: string) {
    try {
      const res = await fetch(`/api/incidents/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { incident: Incident };
      const inc = data.incident;

      setIncidentId(inc.incidentId);
      setIncidentStatus(inc.status);
      setIncidentCategory(inc.category || '');
      setMessages(inc.history || []);
      setActiveIncident(inc);
      setActiveFeedback(inc.feedback);
      setAppState('active-chat');

      const history = inc.history || [];
      const lastMsg = history[history.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.controls && !lastMsg.controls.isCompleted) {
        setActiveControls(lastMsg.controls);
      }

      scrollToBottom();
    } catch {
      // Silently fall back to pre-chat
    }
  }

  async function sendMessage(content: string, category?: string) {
    if (isTyping || !content.trim()) return;

    const userMsg: Message = { role: 'user', content, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    if (appState === 'pre-chat') setAppState('active-chat');
    setActiveControls(null);
    setIsTyping(true);
    setInput('');
    scrollToBottom();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          incidentId: incidentId || undefined,
          category: category || incidentCategory || undefined,
        }),
      });

      const data = await res.json() as ChatApiResponse;

      if (!res.ok) {
        const errMsg: Message = {
          role: 'assistant',
          content: data.error || 'Something went wrong. Please try again.',
          timestamp: new Date(),
        };
        setMessages([...newMessages, errMsg]);
        return;
      }

      setIncidentId(data.incidentId);
      setIncidentStatus(data.status);
      if (data.category) setIncidentCategory(data.category);
      if (data.incident) {
        setActiveIncident(data.incident);
        setActiveFeedback(data.incident.feedback);
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        controls: data.controls || undefined,
      };
      setMessages([...newMessages, assistantMsg]);

      if (data.controls && !data.should_escalate && !data.should_resolve) {
        setActiveControls(data.controls);
      }
    } catch {
      const errMsg: Message = {
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date(),
      };
      setMessages([...newMessages, errMsg]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }

  function handleTileClick(category: string, starterMessage: string) {
    setIncidentCategory(category);
    sendMessage(starterMessage, category);
  }

  function handleControlSubmit(value: string) {
    setActiveControls((prev) => (prev ? { ...prev, isCompleted: true } : null));
    sendMessage(value);
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) { router.push('/login'); return null; }
        return r.json() as Promise<User>;
      })
      .then((u) => { if (u) setUser(u); })
      .catch(() => router.push('/login'));

    fetch('/api/kb/status?category=vdi')
      .then((r) => (r.ok ? r.json() : { exists: false }))
      .then((d: { exists?: boolean }) => setKbAvailable(!!d.exists))
      .catch(() => null);
  }, [router]);

  useEffect(() => {
    const resumeId = sessionStorage.getItem('resume_incident_id');
    if (!resumeId) return;
    sessionStorage.removeItem('resume_incident_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAndResumeIncident(resumeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleNewChat = () => resetChat();
    window.addEventListener('patch:newchat', handleNewChat);
    return () => window.removeEventListener('patch:newchat', handleNewChat);
  });

  const isClosed = incidentStatus === 'Escalated' || incidentStatus === 'Resolved';
  const displayName = user?.username || user?.email?.split('@')[0] || '';
  const lastAssistantIdx = messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i !== -1).pop() ?? -1;
  const showSummary = isClosed && activeIncident;

  return (
    <div className="h-full flex flex-col" data-testid="app-container">
      <Header />
      <div className="flex-1 overflow-hidden flex flex-col" data-testid="main-page">
        {appState === 'pre-chat' ? (
          <div
            className="flex-1 flex flex-col items-center justify-center px-4 pb-24"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, #fce7e7 0%, #fdf6f0 30%, #f9fafb 60%, #f3f4f6 100%)',
            }}
            data-testid="pre-chat-landing"
          >
            <div className="w-full max-w-2xl flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-7 shadow-lg"
                style={{ background: '#DC2626' }}
                data-testid="patch-mark"
              >
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5" />
                  <circle cx="16" cy="16" r="6" fill="white" fillOpacity="0.25" />
                  <path d="M16 4 L16 28 M4 16 L28 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="text-center mb-8" data-testid="welcome-block">
                <p className="text-xl font-semibold text-gray-900 mb-1" data-testid="welcome-line1">
                  Welcome to the Discount Tire Information Center,{' '}
                  <span style={{ color: '#DC2626' }} data-testid="welcome-username">
                    {displayName}
                  </span>
                  .
                </p>
                <p className="text-base text-gray-400" data-testid="welcome-line2">
                  My name is Patch. Let&apos;s get you taken care of.
                </p>
              </div>

              <div
                className="w-full max-w-xs mb-8 cursor-pointer rounded-2xl p-6 text-center transition-all duration-200"
                style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = '0 8px 24px rgba(220,38,38,0.12)';
                  el.style.borderColor = '#DC2626';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  el.style.borderColor = '#E5E7EB';
                  el.style.transform = 'translateY(0)';
                }}
                onClick={() => handleTileClick('vdi', 'I have a problem with my VDI')}
                data-testid="vdi-tile"
              >
                <div className="flex justify-center mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: '#FEF2F2' }}
                    data-testid="vdi-tile-icon"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-2" data-testid="vdi-tile-label">VDI</p>
                <span
                  className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                  style={kbAvailable
                    ? { background: '#D1FAE5', color: '#065F46' }
                    : { background: '#F3F4F6', color: '#6B7280' }
                  }
                  data-testid="vdi-kb-badge"
                >
                  {kbAvailable ? 'KB Available' : 'KB Missing'}
                </span>
              </div>
            </div>

            <div
              className="fixed bottom-6 left-0 right-0 flex justify-center px-4"
              data-testid="composer-container"
            >
              <div
                className="w-full max-w-2xl flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
                style={{ background: 'white', border: '1px solid #E5E7EB' }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                  placeholder="Describe your IT issue…"
                  className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400"
                  style={{ border: 'none' }}
                  data-testid="chat-input"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: !input.trim() || isTyping ? '#E5E7EB' : '#DC2626',
                    border: 'none',
                    cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                  }}
                  data-testid="chat-send-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22 11 13 2 9l20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden" data-testid="active-chat">
            <div
              className="px-4 py-2.5 flex items-center gap-3 shrink-0"
              style={{ background: 'white', borderBottom: '1px solid #F3F4F6' }}
              data-testid="incident-header"
            >
              <span className="text-xs font-mono text-gray-500" data-testid="incident-id">
                {incidentId || '—'}
              </span>
              {incidentCategory && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide" data-testid="incident-category">
                    {incidentCategory.toUpperCase()}
                  </span>
                </>
              )}
              <span className="text-gray-300">|</span>
              <StatusBadge status={incidentStatus} />
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5"
              data-testid="messages-container"
            >
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                {messages.map((msg, i) => {
                  const isLastAssistant = msg.role === 'assistant' && i === lastAssistantIdx;
                  const hasControls = msg.role === 'assistant' && msg.controls;
                  const showControls = isLastAssistant && hasControls && !msg.controls?.isCompleted && !isClosed && !isTyping;

                  return (
                    <div key={i} data-testid={`message-${i}`}>
                      <MessageBubble message={msg} isLast={isLastAssistant} />
                      {hasControls && !showControls && (
                        <DynamicControls
                          controls={{ ...msg.controls!, isCompleted: true }}
                          onSubmit={() => null}
                          disabled
                        />
                      )}
                      {showControls && activeControls && (
                        <DynamicControls
                          controls={activeControls}
                          onSubmit={handleControlSubmit}
                          disabled={isTyping}
                        />
                      )}
                    </div>
                  );
                })}

                {isTyping && <TypingIndicator />}

                {showSummary && !isTyping && (
                  <div className="mt-2 animate-fade-in" data-testid="outcome-block">
                    {incidentStatus === 'Escalated' ? (
                      <div
                        className="px-4 py-3 rounded-xl text-sm mb-2"
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
                        data-testid="escalation-message"
                      >
                        Your issue is being escalated to our Trusted Experts team. They will reach out to assist you shortly.
                      </div>
                    ) : (
                      <div
                        className="px-4 py-3 rounded-xl text-sm mb-2"
                        style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#065F46' }}
                        data-testid="resolution-message"
                      >
                        Great news — your issue has been resolved! Here&apos;s the record for your reference.
                      </div>
                    )}
                    <SummaryCard incident={activeIncident!} type={incidentStatus === 'Escalated' ? 'escalation' : 'resolution'} />
                    <FeedbackCard
                      incidentId={activeIncident!.incidentId}
                      existing={activeFeedback}
                      onSubmitted={(fb) => setActiveFeedback(fb)}
                    />
                  </div>
                )}

                <div style={{ height: '80px' }} />
              </div>
            </div>

            <div
              className="shrink-0 px-4 pb-4 pt-2"
              style={{ background: 'white', borderTop: '1px solid #F3F4F6' }}
              data-testid="active-composer"
            >
              <div className="max-w-2xl mx-auto">
                {isClosed ? (
                  <div
                    className="flex items-center justify-center py-3 rounded-xl text-sm text-gray-400"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                    data-testid="composer-disabled-msg"
                  >
                    This conversation has ended.
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isTyping && sendMessage(input)}
                      placeholder={isTyping ? 'Patch is typing…' : 'Type your reply…'}
                      disabled={isTyping}
                      className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400"
                      style={{ border: 'none' }}
                      data-testid="active-chat-input"
                    />
                    <button
                      onClick={() => !isTyping && sendMessage(input)}
                      disabled={!input.trim() || isTyping}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: !input.trim() || isTyping ? '#E5E7EB' : '#DC2626',
                        border: 'none',
                        cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                      }}
                      data-testid="active-send-btn"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22 11 13 2 9l20-7z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
