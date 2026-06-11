import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabaseService';

interface ClassComparisonProps {
    predictionId: string;
    options: { id: string; label: string }[];
    myOptionId: string;
}

/**
 * Anonymous class-level prediction distribution ("your class predicted...").
 * Social curiosity + recognition without competition or identities.
 *
 * Requires the get_prediction_distribution RPC (docs/supabase_policies.sql);
 * renders nothing if the RPC is missing or there is no class data yet.
 */
const ClassComparison: React.FC<ClassComparisonProps> = ({ predictionId, options, myOptionId }) => {
    const [counts, setCounts] = useState<Record<string, number> | null>(null);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (!isSupabaseConfigured) return;
        let cancelled = false;
        supabase
            .rpc('get_prediction_distribution', { p_prediction_id: predictionId })
            .then(({ data, error }) => {
                if (cancelled || error || !data) return;
                const map: Record<string, number> = {};
                let sum = 0;
                for (const row of data as { option_id: string; picks: number }[]) {
                    if (row.option_id) {
                        map[row.option_id] = Number(row.picks);
                        sum += Number(row.picks);
                    }
                }
                setCounts(map);
                setTotal(sum);
            });
        return () => { cancelled = true; };
    }, [predictionId]);

    if (!counts || total < 2) return null; // need at least someone besides you

    return (
        <div className="mt-4 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-3">
                How your class predicted ({total.toLocaleString()} predictions, anonymous)
            </p>
            <div className="space-y-2">
                {options.map(o => {
                    const n = counts[o.id] || 0;
                    const pct = Math.round((n / total) * 100);
                    const mine = o.id === myOptionId;
                    return (
                        <div key={o.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-40 truncate ${mine ? 'text-violet-300 font-bold' : 'text-slate-400'}`} title={o.label}>
                                {mine ? '▸ ' : ''}{o.label}
                            </span>
                            <div className="flex-1 bg-slate-800 h-3 rounded overflow-hidden">
                                <div
                                    className={`h-full ${mine ? 'bg-violet-500' : 'bg-slate-600'}`}
                                    style={{ width: `${pct}%` }}
                                ></div>
                            </div>
                            <span className="w-10 text-right font-mono text-slate-400">{pct}%</span>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
                A distribution of predictions is itself data: would you expect it to look the same in another class?
            </p>
        </div>
    );
};

export default ClassComparison;
