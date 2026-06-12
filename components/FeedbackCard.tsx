'use client';

import { useState } from 'react';
import { Feedback } from '@/lib/types';

interface Props {
  incidentId: string;
  existing?: Feedback;
  onSubmitted?: (feedback: Feedback) => void;
}

export default function FeedbackCard({ incidentId, existing, onSubmitted }: Props) {
  const [rating, setRating] = useState<number>(existing?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment || '');
  const [submitted, setSubmitted] = useState(!!existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!rating) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/feedback/${incidentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error || 'Failed to submit feedback.');
        return;
      }

      setSubmitted(true);
      const fb: Feedback = { rating, comment, submittedAt: new Date() };
      onSubmitted?.(fb);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl p-5 mt-3"
      style={{ background: 'white', border: '1px solid #E5E7EB' }}
      data-testid="feedback-card"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900 text-sm" data-testid="feedback-heading">
          Rate Your Experience
        </h3>
        <span className="text-xs text-gray-400 font-medium" data-testid="feedback-optional">
          Optional
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4" data-testid="feedback-subtitle">
        How was your experience with Patch today?
      </p>

      {/* Stars */}
      <div className="flex gap-1.5 mb-4" data-testid="feedback-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !submitted && setRating(star)}
            onMouseEnter={() => !submitted && setHover(star)}
            onMouseLeave={() => !submitted && setHover(0)}
            disabled={submitted}
            className="text-2xl transition-transform hover:scale-110"
            style={{
              background: 'none',
              border: 'none',
              cursor: submitted ? 'default' : 'pointer',
              color: star <= (hover || rating) ? '#DC2626' : '#D1D5DB',
            }}
            data-testid={`star-${star}`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => !submitted && setComment(e.target.value)}
        disabled={submitted}
        placeholder="Any additional comments? (optional)"
        rows={3}
        className="w-full px-3 py-2 text-sm border rounded-lg outline-none resize-none mb-3"
        style={{
          borderColor: '#E5E7EB',
          background: submitted ? '#F9FAFB' : 'white',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
        data-testid="feedback-comment"
      />

      {error && (
        <p className="text-xs text-red-600 mb-2" data-testid="feedback-error">
          {error}
        </p>
      )}

      {!submitted ? (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!rating || loading}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: !rating || loading ? '#F87171' : '#DC2626',
              border: 'none',
              cursor: !rating || loading ? 'not-allowed' : 'pointer',
            }}
            data-testid="feedback-submit-btn"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-green-600 font-medium text-right" data-testid="feedback-submitted-msg">
          ✓ Feedback submitted. Thank you!
        </p>
      )}
    </div>
  );
}
