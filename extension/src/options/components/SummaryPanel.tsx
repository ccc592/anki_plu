import React, { useMemo } from 'react';
import type { UserPreferences } from '@messaging/schemas';

type Props = {
  draft: UserPreferences;
  status: string;
  saving: boolean;
};

export const SummaryPanel: React.FC<Props> = ({ draft, status, saving }) => {
  const tagPreview = useMemo(() => {
    const now = new Date();
    return draft.tagTemplate
      .replace('{domain}', draft.siteAllowlist[0] ?? 'example.com')
      .replace('{title}', 'Captured page title')
      .replace('{YYYY-MM-DD}', now.toISOString().split('T')[0])
      .replace('{HH:mm}', now.toTimeString().slice(0, 5));
  }, [draft.tagTemplate, draft.siteAllowlist]);

  const activeHeuristics = useMemo(
    () =>
      Object.entries(draft.heuristics)
        .filter(([, enabled]) => enabled)
        .map(([key]) => heuristicCopy[key as keyof typeof draft.heuristics]),
    [draft.heuristics]
  );

  const mediaSummary = `${draft.mediaPolicy.downloadExternal ? 'Download external' : 'Skip external'} • ${
    draft.mediaPolicy.convertWebP ? 'Convert to WebP' : 'Keep original format'
  }`;

  return (
    <div style={panelStyle}>
      <header>
        <h2 style={panelTitle}>Live summary</h2>
        <p style={panelDescription}>
          A quick overview of how your next capture will behave based on the settings on the left.
        </p>
      </header>

      <div style={cardStyle}>
        <p style={cardEyebrow}>Destination</p>
        <h3 style={cardHeading}>{draft.defaultDeck ?? 'Deck not specified'}</h3>
        <p style={cardBody}>Model: {draft.defaultModel}</p>
        <p style={cardBody}>Tags: {tagPreview}</p>
      </div>

      <div style={cardStyle}>
        <p style={cardEyebrow}>Heuristics</p>
        {activeHeuristics.length > 0 ? (
          <ul style={listStyle}>
            {activeHeuristics.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <p style={cardBody}>No automatic detection enabled — captures will use manual selection only.</p>
        )}
      </div>

      <div style={cardStyle}>
        <p style={cardEyebrow}>Media policy</p>
        <p style={cardBody}>{mediaSummary}</p>
        <p style={cardSubtle}>
          Concurrency: {draft.mediaPolicy.concurrency} • Retry: {draft.mediaPolicy.retryLimit} • Max size:{' '}
          {draft.mediaPolicy.maxSizeMB}MB
        </p>
      </div>

      <div style={cardStyle}>
        <p style={cardEyebrow}>Site rules</p>
        <p style={cardBody}>Allow: {draft.siteAllowlist.length || 'None'} • Block: {draft.siteBlocklist.length || 'None'}</p>
      </div>

      <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <p style={{ ...cardEyebrow, color: '#047857' }}>Status</p>
        <p style={{ ...cardBody, color: '#047857' }}>{saving ? 'Saving…' : status || 'Ready to save changes'}</p>
      </div>
    </div>
  );
};

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem'
};

const panelTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.25rem'
};

const panelDescription: React.CSSProperties = {
  marginTop: '0.5rem',
  color: '#64748b',
  lineHeight: 1.5,
  fontSize: '0.9rem'
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '0.75rem',
  padding: '1rem',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
};

const cardEyebrow: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontSize: '0.7rem',
  color: '#6366f1',
  marginBottom: '0.5rem'
};

const cardHeading: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  color: '#0f172a'
};

const cardBody: React.CSSProperties = {
  margin: '0.4rem 0',
  color: '#1e293b',
  fontSize: '0.9rem'
};

const cardSubtle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: '0.8rem'
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '1.2rem',
  color: '#1e293b',
  fontSize: '0.9rem',
  display: 'grid',
  gap: '0.35rem'
};

const heuristicCopy: Record<keyof UserPreferences['heuristics'], string> = {
  explicitMarkers: 'Explicit markers (Q:, A:)',
  structureHints: 'Structure hints (headings + paragraph)',
  questionMarks: 'Question mark inference',
  listTable: 'List/table pairing'
};
