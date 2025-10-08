import React, { useMemo, useState } from 'react';
import type { UserPreferences } from '@messaging/schemas';
import { SiteRules } from './SiteRules';

interface Props {
  preferences: UserPreferences;
  saving: boolean;
  onSave: (preferences: UserPreferences) => void;
}

export const PreferencesForm: React.FC<Props> = ({ preferences, onSave, saving }) => {
  const [draft, setDraft] = useState<UserPreferences>({ ...preferences });

  const tagPreview = useMemo(() => {
    const now = new Date();
    return draft.tagTemplate
      .replace('{domain}', 'example.com')
      .replace('{title}', 'Sample Title')
      .replace('{YYYY-MM-DD}', now.toISOString().split('T')[0])
      .replace('{HH:mm}', now.toTimeString().slice(0, 5));
  }, [draft.tagTemplate]);

  const handleToggle = (key: keyof UserPreferences['heuristics']) => (checked: boolean) => {
    setDraft((current) => ({
      ...current,
      heuristics: {
        ...current.heuristics,
        [key]: checked
      }
    }));
  };

  const updateMediaPolicy = <K extends keyof UserPreferences['mediaPolicy']>(key: K, value: UserPreferences['mediaPolicy'][K]) => {
    setDraft((current) => ({
      ...current,
      mediaPolicy: {
        ...current.mediaPolicy,
        [key]: value
      }
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section style={sectionStyle}>
        <h2 style={sectionTitle}>General</h2>
        <div style={fieldGrid}>
          <label style={labelStyle}>
            <span>Default Deck</span>
            <input
              style={inputStyle}
              value={draft.defaultDeck ?? ''}
              placeholder="e.g. Web Clips"
              onChange={(event) => setDraft((current) => ({ ...current, defaultDeck: event.target.value || undefined }))}
            />
          </label>
          <label style={labelStyle}>
            <span>Default Model</span>
            <input
              style={inputStyle}
              value={draft.defaultModel}
              onChange={(event) => setDraft((current) => ({ ...current, defaultModel: event.target.value }))}
            />
          </label>
          <label style={{ ...labelStyle, gridColumn: '1 / span 2' }}>
            <span>Tag Template</span>
            <input
              style={inputStyle}
              value={draft.tagTemplate}
              onChange={(event) => setDraft((current) => ({ ...current, tagTemplate: event.target.value }))}
            />
            <small style={hintStyle}>Preview: {tagPreview}</small>
          </label>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Detection Heuristics</h2>
        <div style={toggleGrid}>
          {(
            [
              ['explicitMarkers', 'Explicit markers (Q:, A:)'],
              ['structureHints', 'Structure hints (headings + paragraph)'],
              ['questionMarks', 'Question mark inference'],
              ['listTable', 'List/table pairing']
            ] as Array<[keyof UserPreferences['heuristics'], string]>
          ).map(([key, label]) => (
            <label key={key} style={toggleStyle}>
              <input
                type="checkbox"
                checked={draft.heuristics[key]}
                onChange={(event) => handleToggle(key)(event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Media Policy</h2>
        <div style={fieldGrid}>
          <label style={labelStyle}>
            <span>Download External</span>
            <input
              type="checkbox"
              checked={draft.mediaPolicy.downloadExternal}
              onChange={(event) => updateMediaPolicy('downloadExternal', event.target.checked)}
            />
          </label>
          <label style={labelStyle}>
            <span>Convert to WebP</span>
            <input
              type="checkbox"
              checked={draft.mediaPolicy.convertWebP}
              onChange={(event) => updateMediaPolicy('convertWebP', event.target.checked)}
            />
          </label>
          <label style={labelStyle}>
            <span>Concurrent Downloads</span>
            <input
              type="number"
              style={inputStyle}
              min={1}
              max={6}
              value={draft.mediaPolicy.concurrency}
              onChange={(event) => updateMediaPolicy('concurrency', Number(event.target.value))}
            />
          </label>
          <label style={labelStyle}>
            <span>Retry Limit</span>
            <input
              type="number"
              style={inputStyle}
              min={0}
              max={5}
              value={draft.mediaPolicy.retryLimit}
              onChange={(event) => updateMediaPolicy('retryLimit', Number(event.target.value))}
            />
          </label>
          <label style={labelStyle}>
            <span>Max Size (MB)</span>
            <input
              type="number"
              style={inputStyle}
              min={0}
              value={draft.mediaPolicy.maxSizeMB}
              onChange={(event) => updateMediaPolicy('maxSizeMB', Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Site Rules</h2>
        <SiteRules
          allowlist={draft.siteAllowlist}
          blocklist={draft.siteBlocklist}
          onChange={({ allowlist, blocklist }) =>
            setDraft((current) => ({ ...current, siteAllowlist: allowlist, siteBlocklist: blocklist }))
          }
        />
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Accessibility</h2>
        <label style={toggleStyle}>
          <input
            type="checkbox"
            checked={draft.clipboardEnabled}
            onChange={(event) => setDraft((current) => ({ ...current, clipboardEnabled: event.target.checked }))}
          />
          <span>Allow clipboard import when no selection is available</span>
        </label>
        <label style={{ ...labelStyle, marginTop: '0.75rem' }}>
          <span>Keyboard Shortcut</span>
          <input
            style={inputStyle}
            value={draft.shortcut}
            onChange={(event) => setDraft((current) => ({ ...current, shortcut: event.target.value }))}
          />
        </label>
      </section>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button type="submit" disabled={saving} style={submitStyle}>
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </footer>
    </form>
  );
};

const sectionStyle: React.CSSProperties = {
  background: '#f8fafc',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  border: '1px solid #e2e8f0'
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  fontSize: '1.15rem'
};

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem'
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  fontSize: '0.9rem'
};

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5f5',
  fontSize: '0.9rem'
};

const hintStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.75rem'
};

const toggleGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '0.75rem'
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  background: '#eef2ff',
  border: '1px solid #e0e7ff'
};

const submitStyle: React.CSSProperties = {
  padding: '0.65rem 1.25rem',
  borderRadius: '0.65rem',
  background: '#2563eb',
  color: '#f8fafc',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.95rem'
};
