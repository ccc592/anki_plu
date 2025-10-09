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

/**
 * Constrains position to viewport bounds
 * Ensures the element is always visible within the window
 */
const constrainToViewport = (pos: Position, element: HTMLElement): Position => {
  const rect = element.getBoundingClientRect();
  const width = rect.width || 350; // fallback width
  const height = rect.height || 500; // fallback height
  
  return {
    x: Math.max(0, Math.min(window.innerWidth - width, pos.x)),
    y: Math.max(0, Math.min(window.innerHeight - height, pos.y))
  };
};

/**
 * Validates and adjusts position to ensure it's within viewport
 */
const getValidatedPosition = (
  storageKey: string | undefined,
  initialPosition: Position,
  element: HTMLElement | null
): Position => {
  let pos = initialPosition;
  
  // Try to load from storage first
  if (storageKey) {
    const stored = loadPosition(storageKey);
    if (stored) {
      pos = stored;
    }
  }
  
  // If element is available, constrain to viewport
  if (element) {
    pos = constrainToViewport(pos, element);
  }
  
  return pos;
};

export const useDraggable = (options: DraggableOptions = {}) => {
  const { initialPosition = { x: 20, y: 20 }, onPositionChange, storageKey } = options;
  
  const elementRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null);
  const initialPositionRef = useRef(initialPosition);
  const isInitialized = useRef(false);

  // Initialize and validate position on mount (only once)
  useEffect(() => {
    if (isInitialized.current) return;
    
    const element = elementRef.current;
    if (!element) return;

    // Wait for element to be fully rendered
    const timer = setTimeout(() => {
      const validatedPos = getValidatedPosition(storageKey, initialPositionRef.current, element);
      setPosition(validatedPos);
      isInitialized.current = true;
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle window resize - reposition if needed
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleResize = () => {
      setPosition((currentPos) => {
        const constrained = constrainToViewport(currentPos, element);
        
        // Only update if position actually changed
        if (constrained.x !== currentPos.x || constrained.y !== currentPos.y) {
          // Save the new constrained position
          if (storageKey) {
            savePosition(storageKey, constrained);
          }
          return constrained;
        }
        return currentPos;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [storageKey]);

  // Handle dragging
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

      // Constrain to viewport using utility function
      const constrained = constrainToViewport(newPos, element);
      setPosition(constrained);
      onPositionChange?.(constrained);
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
