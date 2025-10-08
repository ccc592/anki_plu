import React, { useState } from 'react';

interface Props {
  allowlist: string[];
  blocklist: string[];
  onChange: (next: { allowlist: string[]; blocklist: string[] }) => void;
}

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem'
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: '0.75rem',
  padding: '1rem',
  background: '#ffffff'
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #cbd5f5',
  fontSize: '0.9rem'
};

export const SiteRules: React.FC<Props> = ({ allowlist, blocklist, onChange }) => {
  const [allowEntry, setAllowEntry] = useState('');
  const [blockEntry, setBlockEntry] = useState('');

  const addEntry = (type: 'allow' | 'block', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (type === 'allow') {
      const next = Array.from(new Set([...allowlist, trimmed]));
      onChange({ allowlist: next, blocklist });
      setAllowEntry('');
    } else {
      const next = Array.from(new Set([...blocklist, trimmed]));
      onChange({ allowlist, blocklist: next });
      setBlockEntry('');
    }
  };

  const removeEntry = (type: 'allow' | 'block', value: string) => {
    if (type === 'allow') {
      onChange({ allowlist: allowlist.filter((item) => item !== value), blocklist });
    } else {
      onChange({ allowlist, blocklist: blocklist.filter((item) => item !== value) });
    }
  };

  return (
    <section style={containerStyle}>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Allowlist</h3>
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Only process captures on these domains (leave empty to allow all).</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="example.com"
            value={allowEntry}
            onChange={(event) => setAllowEntry(event.target.value)}
          />
          <button type="button" onClick={() => addEntry('allow', allowEntry)} style={buttonStyle}>
            Add
          </button>
        </div>
        <ul style={listStyle}>
          {allowlist.length === 0 && <li style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No restrictions</li>}
          {allowlist.map((domain) => (
            <li key={domain} style={listItemStyle}>
              <span>{domain}</span>
              <button type="button" onClick={() => removeEntry('allow', domain)} style={buttonStyle}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Blocklist</h3>
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Skip capture on these domains even if allowlist permits.</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="ads.example.com"
            value={blockEntry}
            onChange={(event) => setBlockEntry(event.target.value)}
          />
          <button type="button" onClick={() => addEntry('block', blockEntry)} style={buttonStyle}>
            Add
          </button>
        </div>
        <ul style={listStyle}>
          {blocklist.length === 0 && <li style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No blocked domains</li>}
          {blocklist.map((domain) => (
            <li key={domain} style={listItemStyle}>
              <span>{domain}</span>
              <button type="button" onClick={() => removeEntry('block', domain)} style={buttonStyle}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #2563eb',
  background: '#2563eb',
  color: '#f8fafc',
  padding: '0.45rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.8rem'
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#f1f5f9',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem'
};
