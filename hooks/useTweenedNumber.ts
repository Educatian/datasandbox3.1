import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly tweens a numeric value toward its new target (ease-out cubic),
 * so headline statistics roll to their new value instead of jumping.
 * Format at render time: `useTweenedNumber(pValue).toFixed(4)`.
 */
export const useTweenedNumber = (value: number, durationMs = 350): number => {
    const [display, setDisplay] = useState(value);
    const displayRef = useRef(value);
    displayRef.current = display;
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!Number.isFinite(value)) {
            setDisplay(value);
            return;
        }
        const from = Number.isFinite(displayRef.current) ? displayRef.current : value;
        if (from === value) return;
        const start = performance.now();

        const step = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(from + (value - from) * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [value, durationMs]);

    return display;
};
