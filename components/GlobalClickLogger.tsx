
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

export const GlobalClickLogger: React.FC<GlobalClickLoggerProps> = ({ userId = 'anonymous', page = 'unknown' }) => {

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Safety check for target
      if (!event.target) return;
      const target = event.target as HTMLElement;

      const { innerWidth, innerHeight } = window;
      const safeWidth = innerWidth || 1;
      const safeHeight = innerHeight || 1;

      const nx = Number((event.clientX / safeWidth).toFixed(4));
      const ny = Number((event.clientY / safeHeight).toFixed(4));

      // Robust class name extraction (handles SVGAnimatedString)
      let classNameStr = '';
      try {
        const classAttr = target.getAttribute('class');
        if (classAttr) {
            // If it's an object (SVG), convert to string, otherwise use as is
            classNameStr = String(classAttr);
        }
      } catch (e) {
          // Ignore extraction errors
      }

      const payload: LogPayload = {
        userId: userId,
        timestamp: new Date().toISOString(),
        page: page, 
        clickType: determineClickType(target.tagName),
        coordinates: {
          x: event.clientX,
          y: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
          nx,
          ny
        },
        target: {
          tagName: target.tagName,
          id: target.id || '',
          className: classNameStr
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
