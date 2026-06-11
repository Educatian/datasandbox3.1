import React, { useState } from 'react';
import { logEvent } from '../../services/loggingService';

export interface PredictionOption {
    id: string;
    label: string;
    /** Marks the option keyed to the documented misconception (for telemetry). */
    misconception?: string;
    correct?: boolean;
}

interface PredictGateProps {
    /** Short id for telemetry, e.g. 'galton-board-shape' */
    predictionId: string;
    question: string;
    options: PredictionOption[];
    /** Called once the learner commits, before the simulation is revealed. */
    onCommit?: (optionId: string, confidence: number) => void;
    children: React.ReactNode;
}

/**
 * Predict-commit-test gate (predict-observe-explain cycle).
 *
 * Wraps a simulation and asks the learner to commit to a prediction plus a
 * confidence judgment BEFORE they can interact. The commitment, confidence,
 * and chosen option (incl. misconception tag) are logged to the telemetry
 * stream, turning raw clicks into measurable conceptual variables.
 */
const PredictGate: React.FC<PredictGateProps> = ({ predictionId, question, options, onCommit, children }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [confidence, setConfidence] = useState(50);
    const [committed, setCommitted] = useState(false);

    const commit = () => {
        if (!selected) return;
        const opt = options.find(o => o.id === selected);
        logEvent('prediction_commit', 'PredictGate', {
            predictionId,
            option: selected,
            correct: opt?.correct ?? null,
            misconception: opt?.misconception ?? null,
            confidence,
        });
        onCommit?.(selected, confidence);
        setCommitted(true);
    };

    if (committed) {
        return <>{children}</>;
    }

    return (
        <div className="max-w-2xl mx-auto my-10 bg-slate-800/90 border border-violet-500/30 rounded-2xl p-8 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-violet-400 font-bold mb-2">Before you experiment…</p>
            <h2 className="text-xl font-bold text-slate-100 mb-6">{question}</h2>

            <div className="space-y-3 mb-8" role="radiogroup" aria-label="Your prediction">
                {options.map(o => (
                    <button
                        key={o.id}
                        role="radio"
                        aria-checked={selected === o.id}
                        onClick={() => setSelected(o.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selected === o.id
                            ? 'bg-violet-600/30 border-violet-400 text-white shadow-lg shadow-violet-500/10'
                            : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                            }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>

            <div className="mb-8">
                <label className="flex justify-between text-sm text-slate-400 mb-1">
                    <span>How confident are you?</span>
                    <span className="font-mono">{confidence}%</span>
                </label>
                <input
                    type="range"
                    aria-label="Confidence in your prediction"
                    min={0}
                    max={100}
                    step={5}
                    value={confidence}
                    onChange={e => setConfidence(+e.target.value)}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                    <span>Just guessing</span>
                    <span>Certain</span>
                </div>
            </div>

            <button
                onClick={commit}
                disabled={!selected}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-violet-500/20"
            >
                Lock in my prediction → run the experiment
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
                Committing to a prediction first is how scientists (and your brain) learn the most from what happens next.
            </p>
        </div>
    );
};

export default PredictGate;
