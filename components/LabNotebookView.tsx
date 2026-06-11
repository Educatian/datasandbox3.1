import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';
import { getModuleDef } from '../curriculum';
import { getMisconception } from '../data/misconceptions';
import { computeRecommendation } from '../services/adaptiveService';

interface LabNotebookProps {
    userKey: string;
    onBack: () => void;
    navigateTo?: (moduleId: string) => void;
    settings?: Record<string, any> | null;
    isAdmin?: boolean;
}

interface LogRow {
    page: string;
    timestamp: string;
    click_type: string;
    target_id: string;
    target_tag: string;
    target_class: string;
    session_id: string;
}

interface NotebookEntry {
    time: string;
    page: string;
    kind: 'prediction' | 'reveal' | 'mission' | 'chat';
    detail: any;
}

const safeJson = (s: string): any => {
    try { return JSON.parse(s); } catch { return null; }
};

const moduleTitle = (id: string) => getModuleDef(id)?.title || id;

/**
 * The Lab Notebook: every prediction, confrontation, mission, and question
 * the learner produced, assembled back into a personal scientific record.
 * Recognition through artifacts, not points (Lepper-safe), and the learner's
 * own process data made visible (the app practices what it teaches).
 */
const LabNotebookView: React.FC<LabNotebookProps> = ({ userKey, onBack, navigateTo, settings = null, isAdmin = false }) => {
    const [rows, setRows] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setError('Telemetry backend is not configured.');
            setLoading(false);
            return;
        }
        supabase
            .from('user_logs')
            .select('page, timestamp, click_type, target_id, target_tag, target_class, session_id')
            .eq('user_id', userKey)
            .in('click_type', ['CUSTOM_EVENT', 'CHAT'])
            .order('timestamp', { ascending: false })
            .limit(10000)
            .then(({ data, error }) => {
                if (error) setError(error.message);
                else setRows((data || []) as LogRow[]);
                setLoading(false);
            });
    }, [userKey]);

    const entries = useMemo<NotebookEntry[]>(() => {
        const out: NotebookEntry[] = [];
        for (const r of rows) {
            if (r.click_type === 'CUSTOM_EVENT' && r.target_tag === 'PredictGate' && r.target_id === 'prediction_commit') {
                const d = safeJson(r.target_class);
                if (d) out.push({ time: r.timestamp, page: r.page, kind: 'prediction', detail: d });
            } else if (r.click_type === 'CUSTOM_EVENT' && r.target_tag === 'PredictGate' && r.target_id === 'prediction_reveal') {
                const d = safeJson(r.target_class);
                if (d) out.push({ time: r.timestamp, page: r.page, kind: 'reveal', detail: d });
            } else if (r.click_type === 'CUSTOM_EVENT' && r.target_id === 'mission_complete') {
                const d = safeJson(r.target_class);
                if (d) out.push({ time: r.timestamp, page: r.page, kind: 'mission', detail: { ...d, moduleId: r.target_tag } });
            } else if (r.click_type === 'CHAT' && r.target_tag === 'USER') {
                out.push({ time: r.timestamp, page: r.page, kind: 'chat', detail: { text: r.target_class } });
            }
        }
        return out;
    }, [rows]);

    const stats = useMemo(() => {
        const predictions = entries.filter(e => e.kind === 'prediction');
        const reveals = entries.filter(e => e.kind === 'reveal');
        const missions = entries.filter(e => e.kind === 'mission');
        const questions = entries.filter(e => e.kind === 'chat');
        const trials = rows.filter(r => r.target_id === 'experiment_trial').length;

        // JOL calibration: average confidence split by prediction correctness
        const judged = predictions.filter(p => p.detail.correct !== null && p.detail.confidence !== undefined);
        const correct = judged.filter(p => p.detail.correct === true);
        const incorrect = judged.filter(p => p.detail.correct === false);
        const avg = (xs: NotebookEntry[]) => xs.length ? xs.reduce((s, p) => s + (p.detail.confidence || 0), 0) / xs.length : null;

        return {
            predictions: predictions.length,
            accuracy: judged.length ? Math.round((correct.length / judged.length) * 100) : null,
            confWhenRight: avg(correct),
            confWhenWrong: avg(incorrect),
            missions: missions.length,
            questions: questions.length,
            trials,
            modules: new Set(entries.map(e => e.page)).size,
        };
    }, [entries, rows]);

    // Transparent BKT recommendation (the app practicing what it teaches)
    const recommendation = useMemo(() => {
        const isVisible = (id: string) => {
            const s = settings?.[id];
            const state = s?.visibility_state || 'hidden';
            const releaseAt = s?.release_at ? new Date(s.release_at) : null;
            return isAdmin || state === 'visible' || (state === 'scheduled' && !!releaseAt && new Date() >= releaseAt);
        };
        const explored = new Set<string>(rows.map(r => r.page).filter((p): p is string => !!p));
        return computeRecommendation(rows as any, isVisible, explored);
    }, [rows, settings, isAdmin]);
    const [showModelDetails, setShowModelDetails] = useState(false);

    // Group chronological (oldest day first reads like a notebook)
    const byDay = useMemo(() => {
        const map = new Map<string, NotebookEntry[]>();
        for (const e of [...entries].sort((a, b) => a.time.localeCompare(b.time))) {
            const day = e.time.slice(0, 10);
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(e);
        }
        return Array.from(map.entries());
    }, [entries]);

    const renderEntry = (e: NotebookEntry, i: number) => {
        if (e.kind === 'prediction') {
            const mis = getMisconception(e.detail.misconception);
            return (
                <div key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 mt-0.5" aria-hidden="true">🔮</span>
                    <div>
                        <p className="text-slate-300">
                            Predicted <span className="font-mono text-violet-300">{e.detail.option}</span> in{' '}
                            <span className="font-medium text-slate-200">{moduleTitle(e.page)}</span>{' '}
                            with <span className="font-mono">{e.detail.confidence}%</span> confidence
                            {e.detail.correct === true && <span className="text-emerald-400 font-bold"> · held up</span>}
                            {e.detail.correct === false && <span className="text-amber-400 font-bold"> · the simulation disagreed</span>}
                        </p>
                        {mis && e.detail.correct === false && (
                            <p className="text-xs text-slate-500 mt-0.5">Intuition involved: {mis.label}</p>
                        )}
                    </div>
                </div>
            );
        }
        if (e.kind === 'mission') {
            return (
                <div key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 mt-0.5" aria-hidden="true">🏆</span>
                    <p className="text-slate-300">
                        Mission accomplished: <span className="font-medium text-amber-300">{e.detail.title}</span>{' '}
                        <span className="text-slate-500">in {moduleTitle(e.detail.moduleId || e.page)}</span>
                    </p>
                </div>
            );
        }
        if (e.kind === 'chat') {
            return (
                <div key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 mt-0.5" aria-hidden="true">💬</span>
                    <p className="text-slate-400 italic">
                        Asked Dr. Gem: "{String(e.detail.text).slice(0, 140)}{String(e.detail.text).length > 140 ? '…' : ''}"
                        <span className="text-slate-600 not-italic"> ({moduleTitle(e.page)})</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full max-w-4xl mx-auto lab-notebook">
            <div className="flex items-center justify-between mb-6 no-print">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 inline-flex items-center">
                    <span className="mr-2" aria-hidden="true">&larr;</span> Back to Portal
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-bold rounded-xl transition-colors"
                >
                    🖨 Print / Save as PDF
                </button>
            </div>

            <header className="mb-10">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-violet-400">Lab Notebook</h1>
                <p className="text-slate-400 mt-2">
                    Your scientific record: every prediction you committed, every time the data pushed back,
                    every mission you cleared. This is what learning statistics actually looked like.
                </p>
            </header>

            {loading && <p className="text-slate-400" role="status">Assembling your notebook…</p>}
            {error && (
                <div className="bg-amber-900/30 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
                    Could not load your notebook: {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Researcher profile strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-violet-400">{stats.predictions}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Predictions committed</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-emerald-400">{stats.accuracy !== null ? `${stats.accuracy}%` : '—'}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Held up on reveal</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-amber-400">{stats.missions}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Missions cleared</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-cyan-400">{stats.trials.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Experiment trials run</p>
                        </div>
                    </div>

                    {/* Calibration insight: the app practicing the JOL research it serves */}
                    {(stats.confWhenRight !== null || stats.confWhenWrong !== null) && (
                        <div className="mb-10 bg-violet-950/40 border border-violet-700/40 rounded-xl p-4 text-sm">
                            <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-1">Your calibration</p>
                            <p className="text-slate-300">
                                Average confidence when your prediction held: <span className="font-mono text-emerald-300">{stats.confWhenRight !== null ? `${Math.round(stats.confWhenRight)}%` : 'n/a'}</span>
                                {' '}· when it did not: <span className="font-mono text-amber-300">{stats.confWhenWrong !== null ? `${Math.round(stats.confWhenWrong)}%` : 'n/a'}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Well-calibrated scientists are more confident when right than when wrong. Comparing these two numbers on yourself is itself a statistical act.
                            </p>
                        </div>
                    )}

                    {/* Transparent adaptive recommendation */}
                    {recommendation && (
                        <div className="mb-10 bg-cyan-950/40 border border-cyan-700/40 rounded-xl p-4 text-sm no-print">
                            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">Adaptive suggestion (Bayesian Knowledge Tracing)</p>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-slate-300">
                                    Suggested next: <span className="font-bold text-cyan-200">{recommendation.module.title}</span>
                                </p>
                                {navigateTo && (
                                    <button
                                        onClick={() => navigateTo(recommendation.module.id)}
                                        className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Open it
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">{recommendation.reason}</p>
                            <button
                                onClick={() => setShowModelDetails(d => !d)}
                                className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 underline decoration-dotted"
                                aria-expanded={showModelDetails}
                            >
                                {showModelDetails ? 'Hide how this works' : 'How does this work? (it is the BKT model you can learn here)'}
                            </button>
                            {showModelDetails && (
                                <div className="mt-3 text-xs text-slate-400 space-y-2">
                                    <p>
                                        Every prediction you commit and mission you clear is an observation. The same Bayesian
                                        Knowledge Tracing update from the Knowledge Tracer module runs on YOUR data with
                                        prior = {recommendation.params.prior}, learn = {recommendation.params.learn}, guess = {recommendation.params.guess}, slip = {recommendation.params.slip}.
                                    </p>
                                    {recommendation.masteries.length > 0 && (
                                        <div className="space-y-1">
                                            {recommendation.masteries.map(m => (
                                                <div key={m.concept} className="flex items-center gap-2">
                                                    <span className="w-48 truncate text-slate-500">{m.concept}</span>
                                                    <div className="flex-1 bg-slate-800 h-2 rounded overflow-hidden">
                                                        <div className="h-full bg-cyan-500" style={{ width: `${m.mastery * 100}%` }}></div>
                                                    </div>
                                                    <span className="w-16 text-right font-mono">{(m.mastery * 100).toFixed(0)}% <span className="text-slate-600">n={m.observations}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-slate-600">
                                        A model this simple is wrong in interesting ways: notice when its estimate of you disagrees with your own.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chronological record */}
                    {byDay.length === 0 ? (
                        <p className="text-slate-500">
                            Nothing recorded yet. Commit a prediction or clear a mission and it will appear here.
                        </p>
                    ) : (
                        <div className="space-y-8">
                            {byDay.map(([day, dayEntries]) => (
                                <section key={day} aria-label={day}>
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
                                        {new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </h2>
                                    <div className="space-y-3">
                                        {dayEntries.map(renderEntry)}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LabNotebookView;
