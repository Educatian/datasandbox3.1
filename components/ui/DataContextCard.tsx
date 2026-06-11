import React, { useState } from 'react';
import { RealDataset } from '../../data/realDatasets';

/**
 * Provenance card shown whenever a module displays a real dataset:
 * who collected it, why, and how to cite it (GAISE Rec 3 — real data
 * with context and purpose).
 */
const DataContextCard: React.FC<{ dataset: RealDataset }> = ({ dataset }) => {
    const [showCitation, setShowCitation] = useState(false);

    return (
        <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-xl p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-1">
                        Real data · {dataset.year}
                    </p>
                    <h4 className="font-bold text-emerald-200">{dataset.name}</h4>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-emerald-500/80 bg-emerald-900/40 border border-emerald-800/50 rounded-full px-2 py-0.5">
                    n = {dataset.n.toLocaleString()}{dataset.sampled < dataset.n ? ` (showing ${dataset.sampled})` : ''}
                </span>
            </div>
            <p className="text-slate-300 mt-2">{dataset.description}</p>
            <p className="text-slate-400/90 mt-2 text-xs leading-relaxed">{dataset.contextNote}</p>
            <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-emerald-600/90">{dataset.source}</span>
                <button
                    onClick={() => setShowCitation(s => !s)}
                    className="text-emerald-400 hover:text-emerald-300 underline decoration-dotted shrink-0"
                    aria-expanded={showCitation}
                >
                    {showCitation ? 'Hide citation' : 'Cite'}
                </button>
            </div>
            {showCitation && (
                <p className="mt-2 text-xs font-mono text-slate-400 bg-slate-900/60 rounded p-2 border border-slate-700/50 select-all">
                    {dataset.citation}
                </p>
            )}
        </div>
    );
};

export default DataContextCard;
