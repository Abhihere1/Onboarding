'use client';

import { useState } from 'react';
import { Controls, FieldDefinition } from '@/lib/types';

interface Props {
  controls: Controls;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

function OptionButtons({ options, onSelect, disabled }: { options: string[]; onSelect: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3" data-testid="option-buttons">
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(opt)}
          disabled={disabled}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: '#DC2626',
            color: 'white',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C'; }}
          onMouseLeave={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#DC2626'; }}
          data-testid={`option-btn-${i}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SingleSelect({ options, onSelect, disabled }: { options: string[]; onSelect: (v: string) => void; disabled?: boolean }) {
  const [selected, setSelected] = useState('');

  return (
    <div className="mt-3" data-testid="single-select">
      <div className="flex flex-col gap-1 mb-3">
        {options.map((opt, i) => (
          <label
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
            style={{
              background: selected === opt ? '#FEF2F2' : '#F9FAFB',
              border: `1px solid ${selected === opt ? '#DC2626' : '#E5E7EB'}`,
            }}
            data-testid={`single-select-option-${i}`}
          >
            <input
              type="radio"
              name="single-select"
              value={opt}
              checked={selected === opt}
              onChange={() => setSelected(opt)}
              disabled={disabled}
              style={{ accentColor: '#DC2626' }}
            />
            {opt}
          </label>
        ))}
      </div>
      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected || disabled}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
        style={{
          background: !selected || disabled ? '#F87171' : '#DC2626',
          border: 'none',
          cursor: !selected || disabled ? 'not-allowed' : 'pointer',
        }}
        data-testid="single-select-confirm-btn"
      >
        Confirm
      </button>
    </div>
  );
}

interface CardValues {
  [cardIndex: number]: { [fieldName: string]: string };
}

function StructuredForm({
  fieldDefs,
  totalCards,
  onSubmit,
  disabled,
}: {
  fieldDefs: FieldDefinition[];
  totalCards: number;
  onSubmit: (val: string) => void;
  disabled?: boolean;
}) {
  const cardCount = Math.max(1, totalCards);
  const [values, setValues] = useState<CardValues>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const update = (card: number, field: string, val: string) => {
    setValues((prev) => ({ ...prev, [card]: { ...(prev[card] || {}), [field]: val } }));
    setErrors((prev) => { const e = { ...prev }; delete e[`${card}-${field}`]; return e; });
  };

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};
    for (let c = 0; c < cardCount; c++) {
      for (const fd of fieldDefs) {
        if (fd.required && !values[c]?.[fd.name]?.trim()) {
          newErrors[`${c}-${fd.name}`] = `${fd.label} is required`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const parts: string[] = [];
    for (let c = 0; c < cardCount; c++) {
      const cardLabel = cardCount > 1 ? `Item ${c + 1}:` : '';
      const fields = fieldDefs.map((fd) => `${fd.label}: ${values[c]?.[fd.name] || ''}`).join(', ');
      parts.push(cardLabel ? `${cardLabel} ${fields}` : fields);
      setCompleted((prev) => new Set([...prev, c]));
    }
    onSubmit(parts.join(' | '));
  };

  return (
    <div className="mt-3" data-testid="structured-form">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
        {cardCount > 1 ? `${cardCount} Entries Required` : 'Required Information'}
      </p>
      <div className="flex flex-col gap-3">
        {Array.from({ length: cardCount }, (_, c) => (
          <div
            key={c}
            className="p-4 rounded-xl"
            style={{
              border: `1px solid ${completed.has(c) ? '#86EFAC' : '#E5E7EB'}`,
              background: completed.has(c) ? '#F0FDF4' : '#FAFAFA',
            }}
            data-testid={`form-card-${c}`}
          >
            {cardCount > 1 && (
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {fieldDefs[0]?.label?.includes('Device') ? `Device ${c + 1}` : `Entry ${c + 1}`}
              </p>
            )}
            {fieldDefs.map((fd) => (
              <div key={fd.name} className="mb-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{fd.label}</label>
                <input
                  type={fd.type || 'text'}
                  value={values[c]?.[fd.name] || ''}
                  onChange={(e) => update(c, fd.name, e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none"
                  style={{
                    borderColor: errors[`${c}-${fd.name}`] ? '#DC2626' : '#E5E7EB',
                    background: 'white',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#DC2626')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = errors[`${c}-${fd.name}`] ? '#DC2626' : '#E5E7EB')}
                  data-testid={`form-field-${c}-${fd.name}`}
                />
                {errors[`${c}-${fd.name}`] && (
                  <p className="text-xs text-red-600 mt-0.5" data-testid={`form-error-${c}-${fd.name}`}>
                    {errors[`${c}-${fd.name}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="mt-3 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
        style={{
          background: disabled ? '#F87171' : '#DC2626',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        data-testid="form-submit-btn"
      >
        Submit
      </button>
    </div>
  );
}

export default function DynamicControls({ controls, onSubmit, disabled }: Props) {
  if (!controls || controls.isCompleted) return null;

  const { type, options, fieldDefinitions, totalCards } = controls;

  return (
    <div
      className="ml-10 mt-1"
      data-testid="dynamic-controls"
    >
      {type === 'probable_options' && (
        <OptionButtons options={options} onSelect={onSubmit} disabled={disabled} />
      )}
      {type === 'single_select' && (
        <SingleSelect options={options} onSelect={onSubmit} disabled={disabled} />
      )}
      {type === 'structured_form' && (
        <StructuredForm
          fieldDefs={fieldDefinitions}
          totalCards={totalCards || 1}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      )}
    </div>
  );
}
