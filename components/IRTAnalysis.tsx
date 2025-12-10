import React, { useState, useEffect, useCallback } from 'react';
import { IRTParams } from '../types';
import { getIrtExplanation } from '../services/geminiService';
import ICCChart from './ICCChart';
import GeminiExplanation from './GeminiExplanation';

interface IRTAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, min, max, step, onChange }) => (
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

const IRTAnalysis: React.FC<IRTAnalysisProps> = ({ onBack }) => {
    const [irtParams, setIrtParams] = useState<IRTParams>({
        discrimination: 1.0,
        difficulty: 0.0,
    });
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleParamChange = (param: keyof IRTParams, value: number) => {
        setIrtParams(prev => ({ ...prev, [param]: value }));
    };

    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getIrtExplanation(irtParams);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [irtParams]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-lime-400 hover:text-lime-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-lime-400">Item Response Theory (IRT)</h1>
                    <p className="text-slate-400 mt-2">Visualize how item characteristics influence the probability of a correct answer.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <ICCChart params={irtParams} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h3 className="text-lg font-semibold text-lime-400 mb-3 border-b border-lime-400/20 pb-2">Item Parameters</h3>
                        <Slider
                            label="Discrimination (a)"
                            value={irtParams.discrimination}
                            min={0.1}
                            max={5.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('discrimination', +e.target.value)}
                        />
                        <Slider
                            label="Difficulty (b)"
                            value={irtParams.difficulty}
                            min={-3.0}
                            max={3.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('difficulty', +e.target.value)}
                        />
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    IRT is the engine behind modern adaptive tests (like CAT). Instead of a fixed set of questions, CAT selects the next question based on the student's performance. If a student answers a medium-difficulty question correctly, the system presents a harder one. This allows for a much more efficient and accurate estimation of a student's true ability level (theta, θ).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IRTAnalysis;