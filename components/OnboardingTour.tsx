import React, { useState } from 'react';
import { logEvent } from '../services/loggingService';

const TOUR_KEY = 'ds_tour_done_v1';

export const isTourDone = (): boolean => {
    try { return localStorage.getItem(TOUR_KEY) === '1'; } catch { return true; }
};

const STEPS = [
    {
        icon: '🎛️',
        title: 'Everything here is grabbable',
        text: 'Every module is a live simulation: drag the points, turn the dials, break the assumptions. The statistics emerge from what your hands do.'
    },
    {
        icon: '🔮',
        title: 'Predict before you peek',
        text: 'Some modules ask you to lock in a prediction (and how confident you are) before they unlock. That commitment is where the learning happens, so take it seriously.'
    },
    {
        icon: '🏆',
        title: 'Sandbox or Mission, your call',
        text: 'Modules with a mission panel offer graded challenges with live goal tracking. Sandbox mode is always one tap away; nothing is ever locked behind a mission.'
    },
    {
        icon: '🤖',
        title: 'Dr. Gem asks before it answers',
        text: 'The AI tutor knows your current sliders and results, and it will usually point you to a manipulation instead of spoiling the answer. Argue with it.'
    },
    {
        icon: '📓',
        title: 'Your Lab Notebook writes itself',
        text: 'Every prediction, mission, and experiment is collected into your personal lab notebook (book icon, top right). Progress lives under the chart icon. ★ NEXT UP suggests a path; you choose your own.'
    },
];

const OnboardingTour: React.FC<{ onDone: () => void }> = ({ onDone }) => {
    const [step, setStep] = useState(0);

    const finish = (skipped: boolean) => {
        try { localStorage.setItem(TOUR_KEY, '1'); } catch { }
        logEvent(skipped ? 'tour_skipped' : 'tour_completed', 'OnboardingTour', { atStep: step });
        onDone();
    };

    const s = STEPS[step];

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome tour">
            <div className="w-full max-w-md bg-slate-900 border border-violet-500/30 rounded-3xl p-8 shadow-2xl animate-fade-in" key={step}>
                <div className="text-5xl mb-4" aria-hidden="true">{s.icon}</div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">{s.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-8">{s.text}</p>

                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5" aria-hidden="true">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-violet-400' : i < step ? 'bg-violet-800' : 'bg-slate-700'}`}></div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => finish(true)}
                            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Skip
                        </button>
                        <button
                            onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : finish(false)}
                            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            {step < STEPS.length - 1 ? 'Next' : 'Into the sandbox'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
