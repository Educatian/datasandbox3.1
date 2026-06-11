import React, { useMemo, useState } from 'react';
import ModuleShell from './ui/ModuleShell';
import { ITEMS } from '../data/assessmentItems';
import { getMisconception } from '../data/misconceptions';
import { logEvent } from '../services/loggingService';

interface CheckpointAssessmentProps {
    onBack: () => void;
    moduleId?: string; // 'checkpoint-pre' | 'checkpoint-post'
}

type Stage = 'consent' | 'items' | 'done';

/**
 * Pre/post checkpoint assessment with an explicit research-consent step.
 * Ships with original misconception-keyed items; swap in a licensed
 * validated instrument (CAOS/BLIS/GOALS) via data/assessmentItems.ts.
 * Responses are logged to telemetry tagged with phase + consent status.
 */
const CheckpointAssessment: React.FC<CheckpointAssessmentProps> = ({ onBack, moduleId }) => {
    const phase = moduleId === 'checkpoint-post' ? 'post' : 'pre';
    const [stage, setStage] = useState<Stage>('consent');
    const [consented, setConsented] = useState<boolean | null>(null);
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selected, setSelected] = useState<string | null>(null);

    const item = ITEMS[idx];

    const beginWith = (consent: boolean) => {
        setConsented(consent);
        logEvent('assessment_consent', 'CheckpointAssessment', { phase, consent });
        setStage('items');
    };

    const submitAnswer = () => {
        if (!selected) return;
        const opt = item.options.find(o => o.id === selected);
        const next = { ...answers, [item.id]: selected };
        setAnswers(next);
        logEvent('assessment_item', 'CheckpointAssessment', {
            phase,
            consent: consented,
            itemId: item.id,
            concept: item.concept,
            option: selected,
            correct: opt?.correct ?? false,
            misconception: opt?.misconception ?? null,
        });
        setSelected(null);
        if (idx < ITEMS.length - 1) {
            setIdx(idx + 1);
        } else {
            const score = ITEMS.filter(it => {
                const chosen = next[it.id];
                return it.options.find(o => o.id === chosen)?.correct;
            }).length;
            logEvent('assessment_submit', 'CheckpointAssessment', {
                phase,
                consent: consented,
                score,
                total: ITEMS.length,
            });
            setStage('done');
        }
    };

    const results = useMemo(() => {
        if (stage !== 'done') return null;
        const perItem = ITEMS.map(it => {
            const chosen = it.options.find(o => o.id === answers[it.id]);
            return {
                item: it,
                chosen,
                correct: !!chosen?.correct,
                misconception: getMisconception(chosen?.misconception),
            };
        });
        return { perItem, score: perItem.filter(r => r.correct).length };
    }, [stage, answers]);

    return (
        <ModuleShell
            title={phase === 'pre' ? 'Checkpoint: Before You Begin' : 'Checkpoint: After the Journey'}
            subtitle="A short conceptual check, not a graded exam. Honest answers make it useful."
            accentClass="text-teal-400"
            backClass="text-teal-400 hover:text-teal-300"
            maxWidthClass="max-w-3xl"
            onBack={onBack}
        >
            {stage === 'consent' && (
                <div className="bg-slate-800/90 border border-teal-500/30 rounded-2xl p-8">
                    <h2 className="text-lg font-bold text-slate-100 mb-4">Before you start: how your answers are used</h2>
                    <ul className="text-sm text-slate-300 space-y-2 mb-6 list-disc pl-5">
                        <li>This checkpoint has {ITEMS.length} multiple-choice questions about statistical concepts. It takes about 10 minutes.</li>
                        <li>Your answers are stored with your account so the app (and you) can see growth between the pre and post checkpoints.</li>
                        <li>If you consent, your <span className="font-bold">deidentified</span> responses may also be used in research on how people learn statistics. Identities are never published.</li>
                        <li>Consent is voluntary and does not affect your access, your course grade, or anything else. You can take the checkpoint either way.</li>
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => beginWith(true)}
                            className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors"
                        >
                            I consent to research use, start
                        </button>
                        <button
                            onClick={() => beginWith(false)}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-colors"
                        >
                            Start without research use
                        </button>
                    </div>
                </div>
            )}

            {stage === 'items' && (
                <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-8">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-6">
                        <span>Question {idx + 1} of {ITEMS.length}</span>
                        <span className="uppercase tracking-widest">{phase === 'pre' ? 'Pre-checkpoint' : 'Post-checkpoint'}</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-8" aria-hidden="true">
                        <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${(idx / ITEMS.length) * 100}%` }}></div>
                    </div>

                    <h2 className="text-lg text-slate-100 font-medium leading-relaxed mb-6">{item.stem}</h2>
                    <div className="space-y-3 mb-8" role="radiogroup" aria-label="Answer options">
                        {item.options.map(o => (
                            <button
                                key={o.id}
                                role="radio"
                                aria-checked={selected === o.id}
                                onClick={() => setSelected(o.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${selected === o.id
                                    ? 'bg-teal-600/25 border-teal-400 text-white'
                                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                                    }`}
                            >
                                {o.text}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={submitAnswer}
                        disabled={!selected}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                    >
                        {idx < ITEMS.length - 1 ? 'Next question' : 'Finish checkpoint'}
                    </button>
                </div>
            )}

            {stage === 'done' && results && (
                <div className="space-y-6">
                    <div className="bg-slate-800/90 border border-teal-500/30 rounded-2xl p-8 text-center">
                        <p className="text-xs uppercase tracking-widest text-teal-400 font-bold mb-2">{phase === 'pre' ? 'Baseline recorded' : 'Checkpoint complete'}</p>
                        <p className="text-5xl font-bold text-slate-100">{results.score}<span className="text-2xl text-slate-500"> / {ITEMS.length}</span></p>
                        <p className="text-sm text-slate-400 mt-3 max-w-md mx-auto">
                            {phase === 'pre'
                                ? 'This is your starting point, not a judgment. The sandbox exists precisely for the ideas you have not met yet.'
                                : 'Compare this with your pre-checkpoint in your Lab Notebook era: the difference is your learning, measured.'}
                        </p>
                    </div>

                    {phase === 'post' && (
                        <div className="space-y-3">
                            {results.perItem.filter(r => !r.correct && r.misconception).map(r => (
                                <div key={r.item.id} className="bg-amber-950/40 border border-amber-700/40 rounded-xl p-4 text-sm">
                                    <p className="text-amber-300 font-bold text-xs uppercase tracking-wider mb-1">{r.misconception!.label}</p>
                                    <p className="text-slate-300 text-xs">{r.misconception!.truth}</p>
                                    <p className="text-cyan-300/90 text-xs mt-1">Revisit: {r.misconception!.watchFor}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={onBack}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl transition-colors"
                    >
                        Back to Portal
                    </button>
                </div>
            )}
        </ModuleShell>
    );
};

export default CheckpointAssessment;
