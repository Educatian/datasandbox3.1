import React, { useEffect, useRef, useState } from 'react';
import { logEvent } from '../../services/loggingService';
import { playMissionComplete } from '../../services/soundService';

const CONFETTI_COLORS = ['#22d3ee', '#a78bfa', '#fbbf24', '#34d399', '#f472b6'];

const ConfettiBurst: React.FC = () => (
    <div className="absolute inset-0 overflow-visible pointer-events-none" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => {
            const angle = (i / 22) * Math.PI * 2;
            const dist = 60 + (i % 5) * 22;
            return (
                <span
                    key={i}
                    className="confetti-piece"
                    style={{
                        left: '50%',
                        top: '40%',
                        backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                        ['--cx' as any]: `${Math.cos(angle) * dist}px`,
                        ['--cy' as any]: `${Math.sin(angle) * dist - 30}px`,
                        ['--cr' as any]: `${180 + (i * 47) % 360}deg`,
                        animationDelay: `${(i % 6) * 0.03}s`,
                    }}
                />
            );
        })}
    </div>
);

export interface MissionDef {
    id: string;
    title: string;
    brief: string;
    hint?: string;
    /** Evaluated against live module state (closure). True = mission accomplished. */
    check: () => boolean;
}

interface MissionPanelProps {
    moduleId: string;
    missions: MissionDef[];
    /** Accent tailwind text color class, defaults to amber. */
    accentClass?: string;
}

/**
 * Mission layer for free-exploration simulations (challenge with clear goals,
 * uncertain outcomes, and performance feedback) while keeping a Sandbox mode
 * toggle so learner control is never taken away.
 *
 * Missions are checked against live module state ~1.5x/second while Mission
 * Mode is on; starts and completions are logged to the telemetry stream.
 */
const MissionPanel: React.FC<MissionPanelProps> = ({ moduleId, missions, accentClass = 'text-amber-400' }) => {
    const [missionMode, setMissionMode] = useState(false);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [showHint, setShowHint] = useState(false);
    const [justCompleted, setJustCompleted] = useState<string | null>(null);
    const missionsRef = useRef(missions);
    missionsRef.current = missions;
    const startedRef = useRef<Set<string>>(new Set());

    const active = missions.find(m => !completed.has(m.id));
    const allDone = missions.length > 0 && !active;

    // Log mission_start when a mission becomes active in mission mode
    useEffect(() => {
        if (!missionMode || !active) return;
        if (!startedRef.current.has(active.id)) {
            startedRef.current.add(active.id);
            logEvent('mission_start', moduleId, { missionId: active.id, title: active.title });
        }
        setShowHint(false);
    }, [missionMode, active?.id, moduleId]);

    // Poll the active mission's check against live state
    useEffect(() => {
        if (!missionMode) return;
        const interval = setInterval(() => {
            const current = missionsRef.current.find(m => !completed.has(m.id));
            if (!current) return;
            if (current.check()) {
                setCompleted(prev => {
                    const next = new Set(prev);
                    next.add(current.id);
                    return next;
                });
                setJustCompleted(current.id);
                logEvent('mission_complete', moduleId, { missionId: current.id, title: current.title });
                playMissionComplete();
                setTimeout(() => setJustCompleted(null), 4000);
            }
        }, 700);
        return () => clearInterval(interval);
    }, [missionMode, completed, moduleId]);

    if (missions.length === 0) return null;

    return (
        <div className="relative bg-slate-800/90 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
            {justCompleted && <ConfettiBurst />}
            <div className="flex items-center justify-between gap-3 mb-1">
                <p className={`text-[10px] uppercase tracking-widest font-bold ${accentClass}`}>
                    Missions · {completed.size}/{missions.length}
                </p>
                <button
                    onClick={() => setMissionMode(m => !m)}
                    role="switch"
                    aria-checked={missionMode}
                    className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${missionMode
                        ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-600 text-slate-400 hover:text-slate-200'}`}
                >
                    {missionMode ? 'Mission Mode ON' : 'Sandbox Mode (tap for missions)'}
                </button>
            </div>

            {!missionMode && (
                <p className="text-xs text-slate-500">
                    Free exploration. Switch on Mission Mode for {missions.length} graded challenges with live goal tracking.
                </p>
            )}

            {missionMode && (
                <>
                    {/* progress dots */}
                    <div className="flex gap-1.5 my-3" aria-hidden="true">
                        {missions.map(m => (
                            <div
                                key={m.id}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${completed.has(m.id) ? 'bg-amber-400' : m.id === active?.id ? 'bg-slate-500' : 'bg-slate-700'}`}
                            ></div>
                        ))}
                    </div>

                    {justCompleted && (
                        <div className="mb-3 bg-emerald-950/50 border border-emerald-600/40 rounded-lg px-3 py-2 text-xs text-emerald-300 font-bold animate-fade-in" role="status">
                            ✓ Mission accomplished: {missions.find(m => m.id === justCompleted)?.title}
                        </div>
                    )}

                    {active ? (
                        <div>
                            <h4 className="text-sm font-bold text-slate-100">{active.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{active.brief}</p>
                            {active.hint && (
                                <button
                                    onClick={() => setShowHint(h => !h)}
                                    className="mt-2 text-[11px] text-amber-400/90 hover:text-amber-300 underline decoration-dotted"
                                    aria-expanded={showHint}
                                >
                                    {showHint ? 'Hide hint' : 'Need a hint?'}
                                </button>
                            )}
                            {showHint && active.hint && (
                                <p className="mt-1 text-[11px] text-slate-500 italic">{active.hint}</p>
                            )}
                        </div>
                    ) : allDone && (
                        <div className="text-sm text-emerald-300 font-bold">
                            All {missions.length} missions cleared. The sandbox is yours: invent a harder challenge and test it.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MissionPanel;
