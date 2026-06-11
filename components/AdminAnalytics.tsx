import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';
import { ALL_TRACKS } from '../curriculum';

interface LogRow {
    user_id: string;
    page: string;
    concept: string;
    click_type: string;
    timestamp: string;
    session_id: string;
}

const DAYS = 14;

const dayKey = (iso: string) => iso.slice(0, 10);

/**
 * Instructor-facing learning-analytics view over user_logs:
 * concept-by-day engagement heatmap, per-module reach, and chat usage.
 * Requires the admin read policy in docs/supabase_policies.sql.
 */
const AdminAnalytics: React.FC = () => {
    const [rows, setRows] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setError('Supabase not configured.');
            setLoading(false);
            return;
        }
        const since = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('user_logs')
                .select('user_id, page, concept, click_type, timestamp, session_id')
                .gte('timestamp', since)
                .order('timestamp', { ascending: false })
                .limit(50000);
            if (error) setError(error.message);
            else setRows((data || []).filter(r => r.page && r.page !== 'portal'));
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const moduleTitles = useMemo(() => {
        const map: Record<string, string> = {};
        for (const t of ALL_TRACKS) for (const m of t.modules) map[m.id] = m.title;
        return map;
    }, []);

    const days = useMemo(() => {
        const out: string[] = [];
        for (let i = DAYS - 1; i >= 0; i--) {
            out.push(dayKey(new Date(Date.now() - i * 24 * 3600 * 1000).toISOString()));
        }
        return out;
    }, []);

    const conceptHeatmap = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        for (const r of rows) {
            const c = r.concept || 'Unknown';
            const d = dayKey(r.timestamp);
            map[c] = map[c] || {};
            map[c][d] = (map[c][d] || 0) + 1;
        }
        // Sort concepts by total volume, keep top 18
        return Object.entries(map)
            .map(([concept, byDay]) => ({ concept, byDay, total: Object.values(byDay).reduce((a, b) => a + b, 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 18);
    }, [rows]);

    const moduleReach = useMemo(() => {
        const map: Record<string, { users: Set<string>; events: number; chat: number }> = {};
        for (const r of rows) {
            map[r.page] = map[r.page] || { users: new Set(), events: 0, chat: 0 };
            map[r.page].users.add(r.user_id);
            map[r.page].events++;
            if (r.click_type === 'CHAT') map[r.page].chat++;
        }
        return Object.entries(map)
            .map(([page, s]) => ({ page, users: s.users.size, events: s.events, chat: s.chat }))
            .sort((a, b) => b.users - a.users || b.events - a.events);
    }, [rows]);

    const heatColor = (v: number, max: number) => {
        if (!v) return 'bg-slate-800/60';
        const ratio = v / max;
        if (ratio > 0.66) return 'bg-cyan-400';
        if (ratio > 0.33) return 'bg-cyan-600';
        if (ratio > 0.1) return 'bg-cyan-800';
        return 'bg-cyan-900/70';
    };

    if (loading) {
        return <div className="text-slate-400 p-6" role="status">Loading analytics…</div>;
    }
    if (error) {
        return (
            <div className="bg-amber-900/30 border border-amber-700/50 text-amber-300 rounded-xl p-4 text-sm m-4">
                Could not load analytics: {error}. Apply the admin read policy in docs/supabase_policies.sql.
            </div>
        );
    }

    const activeUsers = new Set(rows.map(r => r.user_id)).size;
    const maxCell = Math.max(1, ...conceptHeatmap.flatMap(c => Object.values(c.byDay)));

    return (
        <div className="space-y-10">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-cyan-400">{activeUsers}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Active learners ({DAYS}d)</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-emerald-400">{rows.length.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Interactions</p>
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

            {/* Concept × day heatmap */}
            <section aria-label="Concept engagement heatmap">
                <h3 className="text-lg font-bold text-slate-200 mb-1">Concept engagement (last {DAYS} days)</h3>
                <p className="text-xs text-slate-500 mb-4">Interactions per statistical concept per day. Darker = more activity.</p>
                <div className="overflow-x-auto">
                    <table className="text-xs border-separate border-spacing-0.5">
                        <thead>
                            <tr>
                                <th className="text-left text-slate-500 font-normal pr-3 sticky left-0 bg-slate-900">Concept</th>
                                {days.map(d => (
                                    <th key={d} className="text-slate-600 font-normal px-0.5 text-[9px]" title={d}>{d.slice(8)}</th>
                                ))}
                                <th className="text-slate-500 font-normal pl-2">Σ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conceptHeatmap.map(({ concept, byDay, total }) => (
                                <tr key={concept}>
                                    <td className="text-slate-300 pr-3 whitespace-nowrap sticky left-0 bg-slate-900">{concept}</td>
                                    {days.map(d => (
                                        <td key={d}>
                                            <div
                                                className={`w-5 h-5 rounded-sm ${heatColor(byDay[d] || 0, maxCell)}`}
                                                title={`${concept} · ${d}: ${byDay[d] || 0}`}
                                            ></div>
                                        </td>
                                    ))}
                                    <td className="text-slate-400 font-mono pl-2">{total.toLocaleString()}</td>
                                </tr>
                            ))}
                            {conceptHeatmap.length === 0 && (
                                <tr><td colSpan={DAYS + 2} className="text-slate-500 py-4">No activity in the window.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Module reach */}
            <section aria-label="Module reach">
                <h3 className="text-lg font-bold text-slate-200 mb-1">Module reach</h3>
                <p className="text-xs text-slate-500 mb-4">Unique learners, total interactions, and tutor usage per module.</p>
                <div className="space-y-1.5">
                    {moduleReach.slice(0, 25).map(m => {
                        const maxUsers = moduleReach[0]?.users || 1;
                        return (
                            <div key={m.page} className="flex items-center gap-3 text-sm">
                                <span className="w-56 truncate text-slate-300" title={m.page}>{moduleTitles[m.page] || m.page}</span>
                                <div className="flex-1 bg-slate-800 h-4 rounded overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{ width: `${(m.users / maxUsers) * 100}%` }}></div>
                                </div>
                                <span className="w-14 text-right font-mono text-cyan-300">{m.users}u</span>
                                <span className="w-20 text-right font-mono text-slate-500">{m.events.toLocaleString()}ev</span>
                                <span className="w-14 text-right font-mono text-amber-400/80">{m.chat}💬</span>
                            </div>
                        );
                    })}
                    {moduleReach.length === 0 && <p className="text-slate-500 text-sm">No module activity yet.</p>}
                </div>
            </section>
        </div>
    );
};

export default AdminAnalytics;
