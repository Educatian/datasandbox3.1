import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BKTParams } from '../types';
import { updateMastery } from '../services/statisticsService';
import MasteryBarChart from './MasteryBarChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import ModuleShell from './ui/ModuleShell';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface KnowledgeTracingAnalysisProps {
    onBack: () => void;
}

const INITIAL_MASTERY = 0.25;

const KnowledgeTracingAnalysis: React.FC<KnowledgeTracingAnalysisProps> = ({ onBack }) => {
    const [masteryHistory, setMasteryHistory] = useState<number[]>([INITIAL_MASTERY]);
    const [bktParams, setBktParams] = useState<BKTParams>({ learn: 0.1, guess: 0.2, slip: 0.1 });
    const [lastAnswer, setLastAnswer] = useState<'correct' | 'incorrect' | null>(null);

    // Chat state
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can explain how this Bayesian Knowledge Tracing model estimates student learning. Try submitting some answers!",
        () => `
            We are simulating Bayesian Knowledge Tracing (BKT).
            Current Mastery Probability: ${(currentMastery * 100).toFixed(1)}%
            Parameters: Learn=${bktParams.learn}, Guess=${bktParams.guess}, Slip=${bktParams.slip}
            Last Student Action: ${lastAnswer ? lastAnswer.toUpperCase() : 'None'}
            History Length: ${masteryHistory.length} attempts

            Explain how the mastery probability is updated based on the parameters and student performance.
        `
    );

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

    return (
        <ModuleShell
            title="Knowledge Tracing"
            subtitle="Model a student's knowledge mastery using a Bayesian Knowledge Tracing (BKT) model."
            accentClass="text-rose-400"
            backClass="text-rose-400 hover:text-rose-300"
            onBack={onBack}
        >
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex flex-col justify-center p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-rose-400 text-center">Student's Knowledge Mastery</h3>
                    <MasteryBarChart mastery={currentMastery} />
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button onClick={() => handleAnswer(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 text-lg">
                            Correct Answer <span aria-hidden="true">✅</span>
                        </button>
                        <button onClick={() => handleAnswer(false)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 text-lg">
                            Incorrect Answer <span aria-hidden="true">❌</span>
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h3 className="text-lg font-semibold text-rose-400 mb-3 border-b border-rose-400/20 pb-2">BKT Model Parameters</h3>
                        <Slider label="Learn Rate" value={bktParams.learn} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({ ...p, learn: +e.target.value }))} format={(v) => v.toFixed(2)} />
                        <Slider label="Guess Rate" value={bktParams.guess} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({ ...p, guess: +e.target.value }))} format={(v) => v.toFixed(2)} />
                        <Slider label="Slip Rate" value={bktParams.slip} min={0} max={1} step={0.01} onChange={(e) => setBktParams(p => ({ ...p, slip: +e.target.value }))} format={(v) => v.toFixed(2)} />
                        <button onClick={resetSimulation} className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Reset Learner
                        </button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Knowledge Tracing"
                            history={chatHistory}
                            onSendMessage={sendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
        </ModuleShell>
    );
};

export default KnowledgeTracingAnalysis;

