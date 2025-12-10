import React, { useState, useEffect, useCallback } from 'react';
import { RddPoint, RddResult } from '../types';
import { generateRddData, calculateRddEffect } from '../services/statisticsService';
import { getRddExplanation } from '../services/geminiService';
import RddPlot from './RddPlot';
import GeminiExplanation from './GeminiExplanation';

interface RddAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(1)}</span>
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

const TRUE_EFFECT = 20;
const INITIAL_CUTOFF = 50;

const RddAnalysis: React.FC<RddAnalysisProps> = ({ onBack }) => {
    const [cutoff, setCutoff] = useState(INITIAL_CUTOFF);
    const [bandwidth, setBandwidth] = useState(15);
    const [data, setData] = useState<RddPoint[]>([]);
    const [rddResult, setRddResult] = useState<RddResult | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const regenerateData = useCallback(() => {
        // We generate data based on the initial cutoff to have a consistent "true" model
        const newData = generateRddData(INITIAL_CUTOFF, TRUE_EFFECT, 200);
        setData(newData);
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    useEffect(() => {
        const result = calculateRddEffect(data, cutoff, bandwidth);
        setRddResult(result);
    }, [data, cutoff, bandwidth]);

    useEffect(() => {
        if (!rddResult) return;
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getRddExplanation(rddResult.effect, cutoff);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [rddResult, cutoff]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">Regression Discontinuity Design</h1>
                    <p className="text-slate-400 mt-2">Estimate an intervention's causal effect by analyzing the "jump" at a cutoff point.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    {rddResult && <RddPlot data={data} result={rddResult} cutoff={cutoff} bandwidth={bandwidth} />}
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Analysis Controls</h3>
                        <div className="space-y-4">
                            <Slider label="Cutoff Score" value={cutoff} min={20} max={80} step={1} onChange={e => setCutoff(+e.target.value)} />
                            <Slider label="Bandwidth" value={bandwidth} min={5} max={50} step={1} onChange={e => setBandwidth(+e.target.value)} />
                        </div>
                        <button onClick={regenerateData} className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Estimated Effect</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">"Jump" at Cutoff:</span>
                            <span className="text-2xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {rddResult?.effect.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   Imagine a tutoring program is offered to all students who score below 50 on a pre-test. This creates a sharp cutoff. RDD allows us to estimate the program's true causal effect by comparing the post-test scores of students just below 50 (who received tutoring) to those just above 50 (who didn't). We can assume these two groups were very similar, making this a powerful quasi-experimental method.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RddAnalysis;