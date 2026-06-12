'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/lib/types';

interface Props {
  message: Message;
  isLast?: boolean;
}

function PatchAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ background: '#DC2626' }}
      data-testid="assistant-avatar"
    >
      <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5" />
        <path d="M16 4 L16 28 M4 16 L28 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ImageRenderer({ src, alt }: { src?: string | Blob; alt?: string }) {
  if (!src || typeof src !== 'string') return null;
  const resolvedSrc = src.startsWith('http') ? src : `/api/kb/images/${src}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt || ''}
      className="rounded-lg max-w-full my-3 block"
      style={{ maxHeight: '400px', objectFit: 'contain' }}
      onError={(e) => {
        console.error(`KB image not found: ${src}`);
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
      data-testid="chat-image"
    />
  );
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in" data-testid="user-message">
        <div
          className="max-w-md px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
          style={{ background: '#DC2626', color: 'white' }}
          data-testid="user-bubble"
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in" data-testid="assistant-message">
      <PatchAvatar />
      <div
        className="flex-1 max-w-2xl px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-sm"
        style={{
          background: '#FFFFFF',
          borderLeft: '2px solid #DC2626',
          border: '1px solid #E5E7EB',
          borderLeftWidth: '3px',
          borderLeftColor: '#DC2626',
        }}
        data-testid="assistant-bubble"
      >
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ src, alt }) => <ImageRenderer src={src} alt={alt} />,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#DC2626' }}
                  data-testid="chat-link"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in" data-testid="typing-indicator">
      <PatchAvatar />
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: '3px solid #DC2626' }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
