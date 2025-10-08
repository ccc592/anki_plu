import { useEffect, useRef, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  initialPosition?: Position;
  onPositionChange?: (position: Position) => void;
  storageKey?: string;
}

const STORAGE_PREFIX = 'anki-assistant:popup-position:';

const loadPosition = (key: string): Position | null => {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (stored) {
      return JSON.parse(stored) as Position;
    }
  } catch {
    // ignore
  }
  return null;
};

const savePosition = (key: string, position: Position): void => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(position));
  } catch {
    // ignore
  }
};

export const useDraggable = (options: DraggableOptions = {}) => {
  const { initialPosition = { x: 20, y: 20 }, onPositionChange, storageKey } = options;
  
  const elementRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>(() => {
    if (storageKey) {
      const stored = loadPosition(storageKey);
      if (stored) return stored;
    }
    return initialPosition;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag from header area
      const target = e.target as HTMLElement;
      const isHeader = target.closest('[data-draggable-handle]');
      if (!isHeader) return;

      e.preventDefault();
      setIsDragging(true);
      dragStartPos.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elemX: position.x,
        elemY: position.y
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current) return;

      const deltaX = e.clientX - dragStartPos.current.mouseX;
      const deltaY = e.clientY - dragStartPos.current.mouseY;

      const newPos = {
        x: dragStartPos.current.elemX + deltaX,
        y: dragStartPos.current.elemY + deltaY
      };

      // Constrain to viewport
      const rect = element.getBoundingClientRect();
      newPos.x = Math.max(0, Math.min(window.innerWidth - rect.width, newPos.x));
      newPos.y = Math.max(0, Math.min(window.innerHeight - rect.height, newPos.y));

      setPosition(newPos);
      onPositionChange?.(newPos);
    };

    const handleMouseUp = () => {
      if (dragStartPos.current) {
        setIsDragging(false);
        dragStartPos.current = null;
        
        // Save position
        if (storageKey) {
          savePosition(storageKey, position);
        }
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position, onPositionChange, storageKey]);

  return {
    ref: elementRef,
    position,
    isDragging,
    style: {
      position: 'fixed' as const,
      left: `${position.x}px`,
      top: `${position.y}px`,
      cursor: isDragging ? 'grabbing' : 'default'
    }
  };
};
