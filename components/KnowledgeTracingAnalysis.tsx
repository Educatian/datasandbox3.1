import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BKTParams } from '../types';
import { updateMastery } from '../services/statisticsService';
import { getKnowledgeTracingExplanation } from '../services/geminiService';
import MasteryBarChart from './MasteryBarChart';
import GeminiExplanation from './GeminiExplanation';

interface KnowledgeTracingAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(2)}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const INITIAL_MASTERY = 0.25;

const KnowledgeTracingAnalysis: React.FC<KnowledgeTracingAnalysisProps> = ({ onBack }) => {
    const [masteryHistory, setMasteryHistory] = useState<number[]>([INITIAL_MASTERY]);
    const [bktParams, setBktParams] = useState<BKTParams>({ learn: 0.1, guess: 0.2, slip: 0.1 });
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastAnswer, setLastAnswer] = useState<'correct' | 'incorrect' | null>(null);

    const currentMastery = useMemo(() => masteryHistory[masteryHistory.length - 1], [masteryHistory]);

    const handleAnswer = useCallback((isCorrect: boolean) => {
        const newMastery = updateMastery(currentMastery, isCorrect, bktParams);
        setMasteryHistory(prev => [...prev, newMastery]);
        setLastAnswer(isCorrect ? 'correct' : 'incorrect');
    }, [currentMastery, bktParams]);

    const resetSimulation = () => {
        setMasteryHistory([INITIAL_MASTERY]);
        setLastAnswer(null);
    };

    useEffect(() => {
        if (masteryHistory.length === 1) {
             setExplanation("Adjust the model parameters and provide answers to see how the student's modeled mastery changes.");
             setIsLoading(false);
             return;
        }

        setIsLoading(true);
        const handler = setTimeout(async () => {
            const masteryBefore = masteryHistory[masteryHistory.length - 2];
            const masteryAfter = masteryHistory[masteryHistory.length - 1];
            const exp = await getKnowledgeTracingExplanation(masteryBefore, masteryAfter, lastAnswer === 'correct', bktParams);
            setExplanation(exp);
            setIsLoading(false);
        }, 1000); // Debounce API calls slightly

        return () => clearTimeout(handler);
    }, [masteryHistory, bktParams, lastAnswer]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-rose-400 hover:text-rose-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-rose-400">Knowledge Tracing</h1>
                    <p className="text-slate-400 mt-2">Model a student's knowledge mastery using a Bayesian Knowledge Tracing (BKT) model.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex flex-col justify-center p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-rose-400 text-center">Student's Knowledge Mastery</h3>
                    <MasteryBarChart mastery={currentMastery} />
                    <div className="grid grid-cols-2 gap-4 pt-4">
                         <button onClick={() => handleAnswer(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 text-lg">
                            Correct Answer ✅
                        </button>
                        <button onClick={() => handleAnswer(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 text-lg">
                            Incorrect Answer ❌
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h3 className="text-lg font-semibold text-rose-400 mb-3 border-b border-rose-400/20 pb-2">BKT Model Parameters</h3>
                        <Slider label="Learn Rate" value={bktParams.learn} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({...p, learn: +e.target.value}))} />
                        <Slider label="Guess Rate" value={bktParams.guess} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({...p, guess: +e.target.value}))} />
                        <Slider label="Slip Rate" value={bktParams.slip} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({...p, slip: +e.target.value}))} />
                        <button onClick={resetSimulation} className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Reset Learner
                        </button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   This is the engine behind many adaptive learning systems. By tracking a student's mastery of each skill ('knowledge component'), the system can personalize their learning path. If mastery is low, it offers remedial content. If mastery is high, it provides more challenging problems. The parameters can even be tuned per-student or per-item for maximum accuracy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default KnowledgeTracingAnalysis;
