import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentSequence, LagAnalysisResult, StudentAction } from '../types';
import { generateSequenceData, calculateLagSequentialAnalysis } from '../services/statisticsService';
import { getLSAExplanation } from '../services/geminiService';
import GeminiExplanation from './GeminiExplanation';
import TransitionGraph from './TransitionGraph';

interface LSAAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </label>
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
    </div>
);

const ALL_ACTIONS: StudentAction[] = ['V', 'Q', 'A', 'F', 'P', 'E'];

const LSAAnalysis: React.FC<LSAAnalysisProps> = ({ onBack }) => {
    const [sequences, setSequences] = useState<StudentSequence[]>(() => generateSequenceData(100));
    const [lag, setLag] = useState(1);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const regenerateData = useCallback(() => setSequences(generateSequenceData(100)), []);

    const { resultA, resultB } = useMemo(() => {
        const sequencesA = sequences.filter(s => s.group === 'Group A');
        const sequencesB = sequences.filter(s => s.group === 'Group B');
        const resultA = calculateLagSequentialAnalysis(sequencesA, lag);
        const resultB = calculateLagSequentialAnalysis(sequencesB, lag);
        return { resultA, resultB };
    }, [sequences, lag]);

    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getLSAExplanation(resultA, resultB);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [resultA, resultB]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-blue-400">Lag Sequential Analysis</h1>
                    <p className="text-slate-400 mt-2">Analyze and compare behavioral transition graphs between two groups.</p>
                </div>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <TransitionGraph title="Group A (High-Achievers)" result={resultA} actions={ALL_ACTIONS} />
                    <TransitionGraph title="Group B (Low-Achievers)" result={resultB} actions={ALL_ACTIONS} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">Analysis Controls</h3>
                        <Slider label="Lag" value={lag} min={1} max={3} step={1} onChange={e => setLag(+e.target.value)} />
                        <button onClick={regenerateData} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Regenerate Data</button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    LSA reveals which behaviors predictably follow others. You might find that for struggling students, a failed quiz (`E`) is significantly likely to be followed by visiting the forum (`F`), indicating help-seeking behavior. For high-achievers, watching a video (`V`) might be followed by passing a quiz (`P`), suggesting effective learning. This helps map out and compare learning strategies.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LSAAnalysis;