import React, { useEffect, useMemo, useState } from 'react';
import type { UserPreferences } from '@messaging/schemas';
import { loadPreferences, persistPreferences } from '@shared/preferences';
import { PreferencesForm } from './components/PreferencesForm';
import { SummaryPanel } from './components/SummaryPanel';

export const App: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [draft, setDraft] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    void loadPreferences().then((prefs) => {
      setPreferences(prefs);
      setDraft(prefs);
    });
  }, []);

  const handleSave = async (next: UserPreferences) => {
    setSaving(true);
    try {
      await persistPreferences(next);
      setPreferences(next);
      setDraft(next);
      setStatus('Preferences saved');
      setTimeout(() => setStatus(''), 1500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setDraft(preferences);
    }
  };

  const hasChanges = useMemo(() => {
    if (!preferences || !draft) {
      return false;
    }
    return JSON.stringify(preferences) !== JSON.stringify(draft);
  }, [preferences, draft]);

  if (!draft) {
    return (
      <main style={pageStyle}>
        <h1 style={{ marginBottom: '1rem' }}>Anki Assistant Preferences</h1>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Workspace Controls</p>
          <h1 style={{ margin: 0 }}>Anki Assistant Preferences</h1>
          <p style={subtitleStyle}>
            Tune how captures are organised, interpreted, and stored. Changes are saved locally and
            synced to future sessions once you hit save.
          </p>
        </div>
      </header>
      <div style={contentLayout}>
        <section style={formColumn}>
          <PreferencesForm
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            onReset={handleReset}
            saving={saving}
            hasChanges={hasChanges}
          />
        </section>
        <aside style={summaryColumn}>
          <SummaryPanel draft={draft} status={status} saving={saving} />
        </aside>
      </div>
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  margin: '0 auto',
  maxWidth: '1080px',
  padding: '2.5rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#0f172a'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  marginBottom: '2rem'
};

const eyebrowStyle: React.CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontSize: '0.75rem',
  color: '#6366f1',
  marginBottom: '0.35rem'
};

const subtitleStyle: React.CSSProperties = {
  color: '#64748b',
  maxWidth: '58ch',
  marginTop: '0.75rem',
  lineHeight: 1.6
};

const contentLayout: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2rem'
};

const formColumn: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  flex: '1 1 520px',
  minWidth: '280px'
};

const summaryColumn: React.CSSProperties = {
  position: 'sticky',
  top: '2.5rem',
  alignSelf: 'flex-start',
  flex: '0 0 320px',
  minWidth: '260px'
};
