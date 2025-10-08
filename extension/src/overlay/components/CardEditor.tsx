import React, { useMemo, useState, useRef } from 'react';
import { useCardStore } from '../state/useCardStore';

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.4)',
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#e2e8f0',
  padding: '0.45rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer'
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(59, 130, 246, 0.85)',
  borderColor: 'rgba(59, 130, 246, 0.6)'
};

const previewStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.75rem',
  background: 'rgba(15, 23, 42, 0.85)',
  borderRadius: '0.5rem',
  minHeight: '8rem'
};

const ControlTextarea: React.FC<TextAreaProps> = ({
  label,
  value,
  onChange,
  textareaRef,
  onBold,
  onItalic,
  onCode
}) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.8)' }}>
      {label}
    </span>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button type="button" onClick={onBold} style={buttonStyle}>
        Bold
      </button>
      <button type="button" onClick={onItalic} style={buttonStyle}>
        Italic
      </button>
      <button type="button" onClick={onCode} style={buttonStyle}>
        Code
      </button>
    </div>
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={8}
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: '#e2e8f0',
        resize: 'vertical',
        fontFamily: 'Menlo, ui-monospace, SFMono-Regular, SFMono, Consolas, Liberation Mono, monospace'
      }}
    />
  </label>
);

interface SelectionRange {
  start: number;
  end: number;
}

const applyRichFormatting = (value: string, wrap: { prefix: string; suffix: string }, range?: SelectionRange) => {
  if (!range) {
    return `${value}${wrap.prefix}${wrap.suffix}`;
  }

  return `${value.slice(0, range.start)}${wrap.prefix}${value.slice(range.start, range.end)}${wrap.suffix}${value.slice(range.end)}`;
};

const getSelectionRange = (ref: React.RefObject<HTMLTextAreaElement>): SelectionRange | undefined => {
  const element = ref.current;
  if (!element) {
    return undefined;
  }
  return {
    start: element.selectionStart ?? element.value.length,
    end: element.selectionEnd ?? element.value.length
  };
};

const normalizeHtml = (value: string) => value.replace(/\n/g, '<br/>');

export const CardEditor: React.FC = () => {
  const { cards, activeCardId, updateCard, mergeWithNext, splitCard } = useCardStore();
  const activeCard = useMemo(() => cards.find((card) => card.cardId === activeCardId), [cards, activeCardId]);

  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  const [frontDraft, setFrontDraft] = useState(activeCard?.frontHtml ?? '');
  const [backDraft, setBackDraft] = useState(activeCard?.backHtml ?? '');

  React.useEffect(() => {
    setFrontDraft(activeCard?.frontHtml ?? '');
    setBackDraft(activeCard?.backHtml ?? '');
  }, [activeCard?.frontHtml, activeCard?.backHtml, activeCardId]);

  if (!activeCard) {
    return <div style={{ color: 'rgba(148, 163, 184, 0.7)' }}>Select a card to edit.</div>;
  }

  const persistDrafts = () => {
    updateCard(activeCard.cardId, {
      frontHtml: normalizeHtml(frontDraft),
      backHtml: normalizeHtml(backDraft)
    });
  };

  const applyFront = (wrap: { prefix: string; suffix: string }) => {
    const selection = getSelectionRange(frontRef);
    setFrontDraft((current) => applyRichFormatting(current, wrap, selection));
  };

  const applyBack = (wrap: { prefix: string; suffix: string }) => {
    const selection = getSelectionRange(backRef);
    setBackDraft((current) => applyRichFormatting(current, wrap, selection));
  };

  const handleApplyChanges = () => {
    persistDrafts();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <label
          htmlFor="card-front"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '0.375rem'
          }}
        >
          Front (正面)
        </label>
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
          <button
            type="button"
            onClick={() => applyFront({ prefix: '<strong>', suffix: '</strong>' })}
            style={buttonStyle}
            title="粗体"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFront({ prefix: '<em>', suffix: '</em>' })}
            style={buttonStyle}
            title="斜体"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFront({ prefix: '<code>', suffix: '</code>' })}
            style={buttonStyle}
            title="代码"
          >
            {'<>'}
          </button>
        </div>
        <textarea
          id="card-front"
          ref={frontRef}
          value={frontDraft}
          onChange={(e) => setFrontDraft(e.target.value)}
          onBlur={handleApplyChanges}
          rows={4}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            color: '#e2e8f0',
            resize: 'vertical',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            fontFamily: 'inherit'
          }}
        />
      </div>

      <div>
        <label
          htmlFor="card-back"
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '0.375rem'
          }}
        >
          Back (背面)
        </label>
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
          <button
            type="button"
            onClick={() => applyBack({ prefix: '<strong>', suffix: '</strong>' })}
            style={buttonStyle}
            title="粗体"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyBack({ prefix: '<em>', suffix: '</em>' })}
            style={buttonStyle}
            title="斜体"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyBack({ prefix: '<code>', suffix: '</code>' })}
            style={buttonStyle}
            title="代码"
          >
            {'<>'}
          </button>
        </div>
        <textarea
          id="card-back"
          ref={backRef}
          value={backDraft}
          onChange={(e) => setBackDraft(e.target.value)}
          onBlur={handleApplyChanges}
          rows={4}
          style={{
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            color: '#e2e8f0',
            resize: 'vertical',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            fontFamily: 'inherit'
          }}
        />
      </div>

    </div>
  );
};
