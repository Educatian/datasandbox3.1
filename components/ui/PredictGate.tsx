import React, { useState } from 'react';
import { logEvent } from '../../services/loggingService';
import { getMisconception } from '../../data/misconceptions';
import ClassComparison from './ClassComparison';

export interface PredictionOption {
    id: string;
    label: string;
    /** Marks the option keyed to the documented misconception (for telemetry + feedback). */
    misconception?: string;
    correct?: boolean;
}

interface PredictGateProps {
    /** Short id for telemetry, e.g. 'galton-board-shape' */
    predictionId: string;
    question: string;
    options: PredictionOption[];
    /** Shown after committing: what to watch in the simulation (predict-observe-explain). */
    watchFor?: string;
    /** Called once the learner commits, before the simulation is revealed. */
    onCommit?: (optionId: string, confidence: number) => void;
    children: React.ReactNode;
}

/**
 * Predict-commit-test gate (predict-observe-explain cycle).
 *
 * 1. PREDICT: the learner commits to a prediction plus a confidence judgment
 *    before the simulation unlocks (logged with misconception tags).
 * 2. OBSERVE: a banner tells them what to watch while they experiment.
 * 3. EXPLAIN: on demand, the gate reveals whether their prediction held,
 *    misconception-targeted feedback from the literature-keyed bank, and the
 *    anonymous class prediction distribution.
 */
const PredictGate: React.FC<PredictGateProps> = ({ predictionId, question, options, watchFor, onCommit, children }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [confidence, setConfidence] = useState(50);
    const [committed, setCommitted] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [dismissed, setDismissed] = useState(false);

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

    const reveal = () => {
        const opt = options.find(o => o.id === selected);
        logEvent('prediction_reveal', 'PredictGate', {
            predictionId,
            option: selected,
            correct: opt?.correct ?? null,
            confidence,
        });
        setRevealed(true);
    };

    if (committed) {
        const chosen = options.find(o => o.id === selected);
        const correctOption = options.find(o => o.correct);
        const wasCorrect = !!chosen?.correct;
        const misconception = getMisconception(chosen?.misconception);

        return (
            <>
                {!dismissed && (
                    <div className="max-w-4xl mx-auto mb-6 bg-slate-800/90 border border-violet-500/30 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <p className="text-[10px] uppercase tracking-widest text-violet-400 font-bold mb-1">
                                    Your prediction · confidence {confidence}%
                                </p>
                                <p className="text-sm text-slate-200 font-medium">{chosen?.label}</p>
                                {!revealed && watchFor && (
                                    <p className="text-xs text-cyan-300/90 mt-2">
                                        <span className="font-bold uppercase tracking-wider mr-1">Watch for:</span>
                                        {watchFor}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setDismissed(true)}
                                className="text-slate-500 hover:text-white transition-colors shrink-0 p-1"
                                aria-label="Dismiss prediction banner"
                            >
                                ✕
                            </button>
                        </div>

                        {!revealed ? (
                            <button
                                onClick={reveal}
                                className="mt-3 px-4 py-1.5 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                I've experimented, explain what I saw
                            </button>
                        ) : (
                            <div className="mt-4 animate-fade-in">
                                <div className={`rounded-xl p-4 border ${wasCorrect
                                    ? 'bg-emerald-950/40 border-emerald-700/40'
                                    : 'bg-amber-950/40 border-amber-700/40'}`}>
                                    <p className={`text-sm font-bold ${wasCorrect ? 'text-emerald-300' : 'text-amber-300'}`}>
                                        {wasCorrect
                                            ? 'Your prediction held up.'
                                            : 'The simulation disagreed with your prediction, which is where the learning is.'}
                                    </p>
                                    {!wasCorrect && correctOption && (
                                        <p className="text-xs text-slate-300 mt-2">
                                            <span className="font-bold text-slate-200">What holds: </span>{correctOption.label}
                                        </p>
                                    )}
                                    {misconception && (
                                        <div className="mt-3 text-xs text-slate-300 space-y-1.5">
                                            <p>
                                                <span className="font-bold text-amber-300/90">A very common intuition ({misconception.label}): </span>
                                                {misconception.belief}
                                            </p>
                                            <p>
                                                <span className="font-bold text-slate-200">Why it breaks: </span>
                                                {misconception.truth}
                                            </p>
                                            <p>
                                                <span className="font-bold text-cyan-300/90">Verify it yourself: </span>
                                                {misconception.watchFor}
                                            </p>
                                            <p className="text-[10px] text-slate-500 pt-1">Documented in: {misconception.source}</p>
                                        </div>
                                    )}
                                    {wasCorrect && watchFor && (
                                        <p className="text-xs text-slate-300 mt-2">
                                            <span className="font-bold text-cyan-300/90">Push it further: </span>
                                            {watchFor}
                                        </p>
                                    )}
                                </div>
                                <ClassComparison predictionId={predictionId} options={options} myOptionId={selected!} />
                            </div>
                        )}
                    </div>
                )}
                {children}
            </>
        );
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
