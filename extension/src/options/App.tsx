import React, { useEffect, useState } from 'react';
import type { UserPreferences } from '@messaging/schemas';
import { loadPreferences, persistPreferences } from '@shared/preferences';
import { PreferencesForm } from './components/PreferencesForm';

export const App: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    void loadPreferences().then((prefs) => setPreferences(prefs));
  }, []);

  const handleSave = async (next: UserPreferences) => {
    setSaving(true);
    try {
      await persistPreferences(next);
      setPreferences(next);
      setStatus('Preferences saved');
      setTimeout(() => setStatus(''), 1500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!preferences) {
    return (
      <main style={baseStyle}>
        <h1 style={{ marginBottom: '1rem' }}>Anki Assistant Preferences</h1>
        <p style={{ color: '#64748b' }}>Loading…</p>
      </main>
    );
  }

  return (
    <main style={baseStyle}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Anki Assistant Preferences</h1>
        <p style={{ color: '#64748b' }}>
          Configure default decks, detection heuristics, and media policies for new captures.
        </p>
      </header>
      <PreferencesForm preferences={preferences} onSave={handleSave} saving={saving} />
      {status && <p style={{ marginTop: '1rem', color: '#0f766e' }}>{status}</p>}
    </main>
  );
};

const baseStyle: React.CSSProperties = {
  margin: '0 auto',
  maxWidth: '960px',
  padding: '2rem',
  fontFamily: 'Inter, system-ui, sans-serif'
};
