import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '80px',
  right: '20px',
  padding: '1rem 1.5rem',
  borderRadius: '0.75rem',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 500,
  zIndex: 100000,
  animation: 'toastSlideIn 0.3s ease-out',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  minWidth: '280px'
};

const getBackgroundColor = (type: ToastProps['type']) => {
  switch (type) {
    case 'success':
      return 'rgba(34, 197, 94, 0.95)';
    case 'error':
      return 'rgba(239, 68, 68, 0.95)';
    case 'info':
    default:
      return 'rgba(59, 130, 246, 0.95)';
  }
};

const getIcon = (type: ToastProps['type']) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'info':
    default:
      return 'ℹ';
  }
};

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div
        style={{
          ...toastStyle,
          background: getBackgroundColor(type),
          animation: isVisible ? 'toastSlideIn 0.3s ease-out' : 'toastSlideOut 0.3s ease-in'
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>{getIcon(type)}</span>
        <span>{message}</span>
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
