import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';

// Catalog of PredictGate questions an instructor can project live.
const GATES: { id: string; module: string; question: string; options: { id: string; label: string }[] }[] = [
    {
        id: 'galton-board-shape', module: 'The Galton Board',
        question: '100 balls drop through random pegs: what shape forms?',
        options: [
            { id: 'flat', label: 'Roughly flat' },
            { id: 'bell', label: 'Bell shape' },
            { id: 'edges', label: 'U-shaped' },
            { id: 'unpredictable', label: 'No stable shape' },
        ]
    },
    {
        id: 'dart-board-sd', module: 'The Dart Board',
        question: 'SD 5 vs SD 30, both aiming at the bullseye: what will you see?',
        options: [
            { id: 'tight-vs-scatter', label: 'Tight vs scattered, both centered' },
            { id: 'b-off-target', label: "B's average lands off-center" },
            { id: 'a-better-score', label: 'Every A dart beats every B dart' },
            { id: 'same-picture', label: 'Too few darts to tell' },
        ]
    },
    {
        id: 'coin-flipper-streaks', module: 'The Coin Flipper',
        question: 'Longest run to expect in 100 fair flips?',
        options: [
            { id: 'short', label: 'About 3 at most' },
            { id: 'six-plus', label: '6 or more is likely' },
            { id: 'four-five', label: 'About 4 or 5' },
            { id: 'tails-due', label: 'Tails breaks runs early' },
        ]
    },
    {
        id: 'balance-beam-outlier', module: 'The Balance Beam',
        question: 'One extreme outlier: what happens to mean vs median?',
        options: [
            { id: 'mean-shifts', label: 'Mean shifts, median holds' },
            { id: 'mean-robust', label: 'Mean barely moves' },
            { id: 'both-equal', label: 'Both shift equally' },
            { id: 'median-more', label: 'Median chases it more' },
        ]
    },
    {
        id: 'p-hacking-noise', module: 'The P-Hacking Fisher',
        question: '20 experiments on pure noise at alpha=.05: how many significant?',
        options: [
            { id: 'none', label: 'None, noise cannot be significant' },
            { id: 'about-one', label: 'About 1 on a typical run' },
            { id: 'five-plus', label: 'Five or more' },
            { id: 'p-near-one', label: 'Every p sits near 1' },
        ]
    },
    {
        id: 'ci-meaning', module: 'Confidence Intervals',
        question: 'n goes 5 → 100: what happens to data spread vs CI width?',
        options: [
            { id: 'ci_narrows', label: 'Spread same, CI narrows' },
            { id: 'both_wider', label: 'Both get wider' },
            { id: 'ci_tracks_data', label: 'CI keeps covering 95% of data' },
            { id: 'both_shrink', label: 'Both shrink together' },
        ]
    },
    {
        id: 'signal-noise-paths', module: 'Signal-to-Noise Radio',
        question: 'The t-value is too small: which actions can raise it?',
        options: [
            { id: 'any-path', label: 'Bigger difference OR less noise OR more n' },
            { id: 'only-n', label: 'Only collecting more data' },
            { id: 'only-diff', label: 'Only a bigger difference' },
            { id: 'luck', label: 'Luck' },
        ]
    },
    {
        id: 'effect-magnifier-tradeoff', module: 'Effect Size Magnifier',
        question: 'Tiny effect (d=0.2), n=20 per group: will the scan detect it?',
        options: [
            { id: 'low-power', label: 'Probably not: power is low' },
            { id: 'detectable', label: 'If real, it will be found' },
            { id: 'never', label: 'No realistic n could find it' },
            { id: 'coin-flip', label: '50/50' },
        ]
    },
];

/**
 * Instructor projection view: live, anonymous class prediction distribution
 * for any PredictGate question, auto-refreshing every 5s. Designed to be
 * projected during class for a Peer Instruction flow: predict, discuss,
 * re-predict, then run the simulation together.
 */
const AdminLiveClass: React.FC = () => {
    const [gateId, setGateId] = useState(GATES[0].id);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    const gate = useMemo(() => GATES.find(g => g.id === gateId)!, [gateId]);

    useEffect(() => {
        if (!isSupabaseConfigured) return;
        let cancelled = false;
        const fetchCounts = async () => {
            const { data, error } = await supabase.rpc('get_prediction_distribution', { p_prediction_id: gateId });
            if (cancelled || error || !data) return;
            const map: Record<string, number> = {};
            for (const row of data as { option_id: string; picks: number }[]) {
                if (row.option_id) map[row.option_id] = Number(row.picks);
            }
            setCounts(map);
            setUpdatedAt(new Date().toLocaleTimeString());
        };
        fetchCounts();
        const interval = setInterval(fetchCounts, 5000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [gateId]);

    const values = Object.values(counts) as number[];
    const total = values.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...values);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-200">Live class predictions</h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Project this during class: students predict in their module, the distribution lands here within 5 seconds. Discuss, let them re-enter and re-predict, then run the simulation together.
                    </p>
                </div>
                <select
                    value={gateId}
                    onChange={e => setGateId(e.target.value)}
                    aria-label="Prediction question"
                    className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-indigo-500 outline-none"
                >
                    {GATES.map(g => <option key={g.id} value={g.id}>{g.module}</option>)}
                </select>
            </div>

            {/* Projection card: deliberately huge type for the back row */}
            <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-8">
                <p className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2">{gate.module}</p>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-100 mb-8">{gate.question}</h2>

                {total === 0 ? (
                    <p className="text-slate-500 text-lg">
                        No predictions yet. Send the class into the module; bars appear here as they commit.
                    </p>
                ) : (
                    <div className="space-y-5">
                        {gate.options.map(o => {
                            const n = counts[o.id] || 0;
                            const pct = total ? Math.round((n / total) * 100) : 0;
                            return (
                                <div key={o.id}>
                                    <div className="flex justify-between text-lg lg:text-xl mb-1.5">
                                        <span className="text-slate-200">{o.label}</span>
                                        <span className="font-mono text-indigo-300">{pct}% <span className="text-slate-500 text-sm">({n})</span></span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-6 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-700"
                                            style={{ width: `${(n / max) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-between items-center mt-8 text-sm text-slate-500">
                    <span>{total.toLocaleString()} predictions · anonymous · all-time for this question</span>
                    {updatedAt && <span>Updated {updatedAt} · refreshes every 5s</span>}
                </div>
            </div>
        </div>
    );
};

export default AdminLiveClass;
