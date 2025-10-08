import React from 'react';

interface BulkActionsToolbarProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  background: 'rgba(15, 23, 42, 0.6)',
  borderRadius: '0.5rem',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  marginBottom: '0.5rem'
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  background: 'rgba(59, 130, 246, 0.15)',
  color: '#93c5fd',
  padding: '0.4rem 0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem'
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#fca5a5'
};

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  totalCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected
}) => {
  const allSelected = selectedCount === totalCount;

  return (
    <div style={toolbarStyle}>
      <button
        type="button"
        style={buttonStyle}
        onClick={allSelected ? onDeselectAll : onSelectAll}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
        }}
        title={allSelected ? 'Deselect all (Ctrl+A)' : 'Select all (Ctrl+A)'}
      >
        <span>{allSelected ? '☐' : '☑'}</span>
        <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
      </button>

      {selectedCount > 0 && (
        <button
          type="button"
          style={dangerButtonStyle}
          onClick={onDeleteSelected}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          title="Delete selected cards"
        >
          <span>🗑️</span>
          <span>Delete ({selectedCount})</span>
        </button>
      )}

      <div
        style={{
          marginLeft: 'auto',
          fontSize: '0.75rem',
          color: 'rgba(148, 163, 184, 0.7)',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <span>{selectedCount} / {totalCount} selected</span>
      </div>
    </div>
  );
};
