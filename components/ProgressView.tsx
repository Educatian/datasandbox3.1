import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';
import { ALL_TRACKS, SECTION_THEMES } from '../curriculum';

interface ProgressViewProps {
    userKey: string; // the user_id value used by the logger (email or uid)
    onBack: () => void;
    navigateTo: (moduleId: string) => void;
}

interface ModuleStats {
    events: number;
    sessions: Set<string>;
    firstSeen: string;
    lastSeen: string;
    chatTurns: number;
}

/**
 * Student-facing progress dashboard built from the existing user_logs
 * telemetry: which modules were explored, how much, and when.
 */
const ProgressView: React.FC<ProgressViewProps> = ({ userKey, onBack, navigateTo }) => {
    const [rows, setRows] = useState<{ page: string; timestamp: string; click_type: string; session_id: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setError('Telemetry backend is not configured.');
            setLoading(false);
            return;
        }
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('user_logs')
                .select('page, timestamp, click_type, session_id')
                .eq('user_id', userKey)
                .order('timestamp', { ascending: false })
                .limit(20000);
            if (error) {
                setError(error.message);
            } else {
                setRows(data || []);
            }
            setLoading(false);
        };
        fetchLogs();
    }, [userKey]);

    const statsByModule = useMemo(() => {
        const map: Record<string, ModuleStats> = {};
        for (const r of rows) {
            if (!r.page || r.page === 'portal') continue;
            if (!map[r.page]) {
                map[r.page] = { events: 0, sessions: new Set(), firstSeen: r.timestamp, lastSeen: r.timestamp, chatTurns: 0 };
            }
            const s = map[r.page];
            s.events++;
            s.sessions.add(r.session_id);
            if (r.timestamp < s.firstSeen) s.firstSeen = r.timestamp;
            if (r.timestamp > s.lastSeen) s.lastSeen = r.timestamp;
            if (r.click_type === 'CHAT') s.chatTurns++;
        }
        return map;
    }, [rows]);

    // "Explored" = at least 5 logged interactions in the module
    const exploredIds = useMemo(() =>
        new Set(Object.entries(statsByModule).filter(([, s]: [string, ModuleStats]) => s.events >= 5).map(([id]) => id)),
        [statsByModule]);

    const totalModules = ALL_TRACKS.reduce((n, t) => n + t.modules.length, 0);

    return (
        <div className="w-full max-w-5xl mx-auto">
            <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-6 inline-flex items-center">
                <span className="mr-2" aria-hidden="true">&larr;</span> Back to Portal
            </button>

            <header className="mb-10">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">My Progress</h1>
                <p className="text-slate-400 mt-2">Your exploration footprint across the curriculum, from your own interaction telemetry.</p>
            </header>

            {loading && (
                <div className="text-slate-400 flex items-center gap-3" role="status">
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading your activity...
                </div>
            )}
            {error && (
                <div className="bg-amber-900/30 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm">
                    Could not load progress data: {error}. If this persists, your instructor may need to update the
                    telemetry read policy (see docs/supabase_policies.sql).
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-cyan-400">{exploredIds.size}<span className="text-base text-slate-500"> / {totalModules}</span></p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Modules explored</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-emerald-400">{rows.length.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Interactions logged</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-violet-400">{new Set(rows.map(r => r.session_id)).size}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Sessions</p>
                        </div>
                        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-3xl font-bold text-amber-400">{rows.filter(r => r.click_type === 'CHAT').length}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Dr. Gem turns</p>
                        </div>
                    </div>

                    {/* Per-track breakdown */}
                    <div className="space-y-8">
                        {ALL_TRACKS.map((track, index) => {
                            const theme = SECTION_THEMES[index % SECTION_THEMES.length];
                            const explored = track.modules.filter(m => exploredIds.has(m.id)).length;
                            const pct = Math.round((explored / track.modules.length) * 100);
                            return (
                                <section key={track.id} aria-label={track.title} className={`rounded-2xl border ${theme.borderColor} ${theme.bgColor} p-6`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className={`text-lg font-bold ${theme.titleColor}`}>{track.title}</h2>
                                        <span className="text-sm text-slate-400 font-mono">{explored}/{track.modules.length}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${track.title} progress`}>
                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-700" style={{ width: `${pct}%` }}></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {track.modules.map(m => {
                                            const s = statsByModule[m.id];
                                            const done = exploredIds.has(m.id);
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => navigateTo(m.id)}
                                                    title={s ? `${s.events} interactions · ${s.sessions.size} session(s) · last ${new Date(s.lastSeen).toLocaleDateString()}` : 'Not visited yet'}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${done
                                                        ? 'bg-cyan-900/40 border-cyan-700 text-cyan-300 hover:bg-cyan-900/70'
                                                        : s
                                                            ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                                            : 'bg-slate-900 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                                                        }`}
                                                >
                                                    {done ? '✓ ' : ''}{m.title}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProgressView;
