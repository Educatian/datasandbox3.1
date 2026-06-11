import React from 'react';

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Format the displayed value; defaults to step-aware fixed decimals. */
    format?: (v: number) => string;
    disabled?: boolean;
}

const defaultFormat = (v: number, step: number) =>
    Number.isInteger(step) ? v.toFixed(0) : v.toFixed(1);

/**
 * The shared parameter slider used across analysis modules
 * (previously copy-pasted into ~30 components).
 */
const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange, format, disabled }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{format ? format(value) : defaultFormat(value, step)}</span>
        </label>
        <input
            type="range"
            aria-label={label}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
    </div>
);

export default Slider;
