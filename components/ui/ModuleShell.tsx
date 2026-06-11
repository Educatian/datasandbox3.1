import React from 'react';

interface ModuleShellProps {
    title: string;
    subtitle?: string;
    /** Accent text color for the title, e.g. 'text-cyan-400' (literal Tailwind class). */
    accentClass?: string;
    /** Back-link color, e.g. 'text-cyan-400 hover:text-cyan-300'. Defaults to accent-ish cyan. */
    backClass?: string;
    maxWidthClass?: string;
    onBack: () => void;
    children: React.ReactNode;
}

/**
 * Standard chrome for analysis modules: consistent back affordance,
 * centered title block, container width, and entrance transition.
 * Games with bespoke themed headers can keep their own chrome.
 */
const ModuleShell: React.FC<ModuleShellProps> = ({
    title,
    subtitle,
    accentClass = 'text-cyan-400',
    backClass = 'text-cyan-400 hover:text-cyan-300',
    maxWidthClass = 'max-w-6xl',
    onBack,
    children,
}) => (
    <div className={`w-full ${maxWidthClass} mx-auto animate-fade-in`}>
        <header className="mb-8">
            <button onClick={onBack} className={`${backClass} mb-4 inline-flex items-center transition-colors`}>
                <span className="mr-2" aria-hidden="true">&larr;</span> Back to Portal
            </button>
            <div className="text-center">
                <h1 className={`text-4xl font-bold ${accentClass}`}>{title}</h1>
                {subtitle && <p className="text-slate-400 mt-2">{subtitle}</p>}
            </div>
        </header>
        {children}
    </div>
);

export default ModuleShell;
