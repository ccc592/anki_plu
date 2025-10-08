import React, { useState } from 'react';
import { App as FullEditorApp } from './App';
import { QuickImportPopup } from './QuickImportPopup';
import { useCardStore } from './state/useCardStore';

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(2px)',
  zIndex: 1
};

const handleClose = () => {
  if (typeof window !== 'undefined' && '__ankiAssistantUnmount' in window) {
    (window as { __ankiAssistantUnmount?: () => void }).__ankiAssistantUnmount?.();
  }
};

export const AppContainer: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  const cardCount = cards.filter(c => c.selected !== false).length;

  const switchToFullEditor = () => {
    setMode('full');
  };

  if (mode === 'full') {
    // Full screen editor mode
    return <FullEditorApp />;
  }

  // Quick import mode with backdrop
  return (
    <>
      {/* Backdrop */}
      <div 
        style={backdropStyle} 
        onClick={handleClose}
      />
      
      {/* Quick Import Popup */}
      <QuickImportPopup
        cardCount={cardCount}
        onSwitchToFullEditor={switchToFullEditor}
        onClose={handleClose}
      />
    </>
  );
};
