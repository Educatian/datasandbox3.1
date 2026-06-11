import React from 'react';
import { AssessmentDef, SECTION_THEMES } from '../curriculum';

interface CurriculumViewProps {
    tracks: AssessmentDef[];
    navigateTo: (moduleId: string) => void;
    settings?: Record<string, any> | null;
    isAdmin?: boolean;
    completedModuleIds?: Set<string>;
}

const CurriculumView: React.FC<CurriculumViewProps> = ({ tracks, navigateTo, settings = null, isAdmin = false, completedModuleIds }) => {
    // "Next up" suggestion: first visible module not yet explored. A nudge,
    // not a gate — every visible module stays one click away.
    const isModuleVisible = (modId: string) => {
        const setting = settings?.[modId];
        const state = setting?.visibility_state || 'hidden';
        const releaseAt = setting?.release_at ? new Date(setting.release_at) : null;
        return isAdmin || state === 'visible' || (state === 'scheduled' && !!releaseAt && new Date() >= releaseAt);
    };
    const suggestedId = completedModuleIds
        ? tracks.flatMap(t => t.modules).find(m => isModuleVisible(m.id) && !completedModuleIds.has(m.id))?.id
        : undefined;

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="relative text-center mb-16 rounded-3xl overflow-hidden border border-slate-700/40 shadow-2xl">
                <img
                    src="/brand/hero.webp"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900"></div>
                <div className="relative z-10 pt-12 pb-16 px-4">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <img src="/brand/logo.webp" alt="Data Sandbox logo" className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl shadow-lg shadow-cyan-500/20" />
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-300 font-game tracking-tight filter drop-shadow-lg">
                            Data Sandbox
                        </h1>
                    </div>
                    <p className="text-slate-300 mt-4 text-lg sm:text-xl font-light tracking-wide drop-shadow">
                        Interactive Statistics Playground
                    </p>
                    <p className="text-slate-400/80 mt-2 text-sm max-w-xl mx-auto">
                        Don't just read about statistics. Grab it, drag it, break it, and watch the concepts emerge.
                    </p>
                </div>
            </header>

            <div className="space-y-16">
                {tracks.map((assessment, index) => {
                    const theme = SECTION_THEMES[index % SECTION_THEMES.length];

                    const visibleModules = assessment.modules.filter((mod) => {
                        const setting = settings?.[mod.id];
                        const state = setting?.visibility_state || 'hidden'; // Default to hidden
                        const releaseAt = setting?.release_at ? new Date(setting.release_at) : null;
                        const isScheduledReleased = releaseAt ? new Date() >= releaseAt : false;
                        return isAdmin
                            || state === 'visible'
                            || (state === 'scheduled' && isScheduledReleased);
                    });
                    if (visibleModules.length === 0) return null;

                    return (
                        <section key={assessment.id} aria-label={assessment.title} className={`relative rounded-3xl p-8 border ${theme.borderColor} ${theme.bgColor} backdrop-blur-sm`}>
                            <div className="absolute -top-5 left-8 px-4 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {assessment.title}
                            </div>

                            <div className="mb-8 pl-2">
                                <h2 className={`text-3xl font-bold ${theme.titleColor} mb-1`}>{assessment.title}</h2>
                                <p className="text-slate-400 text-sm uppercase tracking-widest font-medium opacity-80">{assessment.subTitle}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleModules.map((mod) => {
                                    const setting = settings?.[mod.id];
                                    const state = setting?.visibility_state || 'hidden';
                                    const releaseAt = setting?.release_at ? new Date(setting.release_at) : null;
                                    const isCompleted = completedModuleIds?.has(mod.id);

                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => navigateTo(mod.id)}
                                            className={`text-left bg-slate-800/80 hover:bg-slate-800 p-6 rounded-xl border border-slate-700/50 ${theme.hoverBorder} transition-all duration-300 group relative overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400`}
                                        >
                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                    <h3 className={`text-lg font-bold ${theme.accentColor} group-hover:text-white transition-colors`}>
                                                        {mod.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {mod.id === suggestedId && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-violet-900/60 text-violet-300 border-violet-700 animate-pulse" title="Suggested next step (you choose your own path)">
                                                                ★ NEXT UP
                                                            </span>
                                                        )}
                                                        {isCompleted && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-cyan-900/50 text-cyan-300 border-cyan-800" title="You have explored this module">
                                                                ✓ DONE
                                                            </span>
                                                        )}
                                                        {isAdmin && (
                                                            <span aria-label={`Visibility: ${state}`} className={`text-[10px] px-1.5 py-0.5 rounded border ${state === 'visible' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' :
                                                                state === 'scheduled' ? 'bg-amber-900/50 text-amber-400 border-amber-800' :
                                                                    'bg-red-900/50 text-red-400 border-red-800'
                                                                }`}>
                                                                {state === 'visible' ? '● VISIBLE' :
                                                                    state === 'scheduled' ? (releaseAt && releaseAt > new Date() ? '◷ WAITING' : '◷ SCHEDULED') :
                                                                        '✕ HIDDEN'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-400 mb-4 line-clamp-3 flex-grow">
                                                    {mod.description}
                                                </p>
                                                <div className="mt-auto">
                                                    <div className={`text-xs text-slate-500 italic bg-slate-900/50 p-3 rounded border border-slate-700/30`}>
                                                        <span className="font-bold not-italic text-slate-600 mr-1">Activity:</span>
                                                        {mod.manipulation}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Decor element */}
                                            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-all opacity-0 group-hover:opacity-20 ${theme.glow}`}></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default CurriculumView;
