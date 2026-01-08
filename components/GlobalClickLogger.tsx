
import React, { useEffect } from 'react';
import { sendLog, LogPayload } from '../services/loggingService';

interface GlobalClickLoggerProps {
  userId?: string;
  page?: string;
}

// --- Helper: Classification Logic ---
const determineClickType = (tagName: string): string => {
  const uiTags = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'LABEL', 'OPTION', 'LI'];
  return uiTags.includes(tagName.toUpperCase()) ? 'UI_CLICK' : 'GLOBAL_CLICK';
};

// --- Helper: Find meaningful interactive parent ---
const findInteractiveParent = (el: HTMLElement | null): HTMLElement | null => {
  let current = el;
  let depth = 0;
  // Walk up to 5 levels to find the main container (e.g., button wrapping an icon)
  while (current && depth < 5) {
    const tag = current.tagName.toUpperCase();
    // Standard interactive elements
    if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) {
      return current;
    }
    // Elements acting as buttons
    if (current.getAttribute('role') === 'button' || current.onclick) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }
  return null;
};

// --- Helper: Extract descriptive context label ---
const getContextLabel = (target: HTMLElement, interactiveParent: HTMLElement | null): string => {
  const el = interactiveParent || target;

  // 1. Explicit logging context override
  const logContext = el.getAttribute('data-log-context');
  if (logContext) return logContext;

  // 2. Accessibility Labels (highest quality)
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // 3. Text Content (cleaned)
  // We prioritize the interactive parent's text, but if empty, use target's text
  const text = el.innerText || target.innerText || '';
  const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 50); // limit length
  if (cleanText) return cleanText;

  // 4. IDs or Technical Identifiers
  if (el.id) return `ID:${el.id}`;

  // 5. Fallback
  return `${el.tagName}`;
};

export const GlobalClickLogger: React.FC<GlobalClickLoggerProps> = ({ userId = 'anonymous', page = 'unknown' }) => {

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Safety check for target
      if (!event.target) return;
      const originalTarget = event.target as HTMLElement;

      // Find the "meaningful" element (e.g. the button, not the span inside it)
      const interactiveParent = findInteractiveParent(originalTarget);

      // If we clicked something non-interactive and it's not a known UI tag, generic log
      // But we still log it as the user requested "every click"
      const targetElement = interactiveParent || originalTarget;

      const { innerWidth, innerHeight } = window;
      const safeWidth = innerWidth || 1;
      const safeHeight = innerHeight || 1;

      // Extract Context
      const contextLabel = getContextLabel(originalTarget, interactiveParent);
      const clickType = interactiveParent ? 'SMART_CLICK' : determineClickType(originalTarget.tagName);

      const nx = Number((event.clientX / safeWidth).toFixed(4));
      const ny = Number((event.clientY / safeHeight).toFixed(4));

      // Robust class name extraction
      let classNameStr = '';
      try {
        const classAttr = targetElement.getAttribute('class');
        if (classAttr) {
          classNameStr = String(classAttr);
        }
      } catch (e) { }

      const payload: LogPayload = {
        userId: userId,
        timestamp: new Date().toISOString(),
        page: page,
        clickType: clickType,
        coordinates: {
          x: event.clientX,
          y: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
          nx,
          ny
        },
        target: {
          tagName: targetElement.tagName,
          id: targetElement.id || '',
          className: classNameStr,
          label: contextLabel // Enriched context
        },
        screenSize: {
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height
        }
      };

      // Delegate to centralized service
      sendLog(payload);
    };

    // Capture phase to ensure we record every click
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, [userId, page]);

  return <></>;
};
