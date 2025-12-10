import React, { useState, useEffect, useCallback } from 'react';
import { PSMDataPoint } from '../types';
import { generatePSMData, performMatching } from '../services/statisticsService';
import { getPSMExplanation } from '../services/geminiService';
import PSMComparisonPlot from './PSMComparisonPlot';
import GeminiExplanation from './GeminiExplanation';

interface PSMAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, format?: (v: number) => string}> = ({ label, value, min, max, step, onChange, format }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{format ? format(value) : value}</span>
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

const PSMAnalysis: React.FC<PSMAnalysisProps> = ({ onBack }) => {
    const [selectionBias, setSelectionBias] = useState(15);
    const [data, setData] = useState<PSMDataPoint[]>([]);
    const [isMatched, setIsMatched] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const regenerateData = useCallback(() => {
        const newData = generatePSMData(150, selectionBias);
        setData(newData);
        setIsMatched(false);
    }, [selectionBias]);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const handleMatch = () => {
        const matchedData = performMatching(data);
        setData(matchedData);
        setIsMatched(true);
    };

    const handleReset = () => {
        setIsMatched(false);
        setData(prevData => prevData.map(p => ({...p, isMatched: false, matchedWithId: null })));
    };

    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getPSMExplanation(isMatched, selectionBias);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [isMatched, selectionBias]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-green-400 hover:text-green-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-green-400">Propensity Score Matching</h1>
                    <p className="text-slate-400 mt-2">Visually balance two groups to create a fair comparison.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4 min-h-[500px]">
                    <PSMComparisonPlot data={data} isMatched={isMatched} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-green-400 mb-3">Simulation Controls</h3>
                        <Slider 
                            label="Selection Bias"
                            value={selectionBias}
                            min={0} max={40} step={1}
                            onChange={(e) => setSelectionBias(+e.target.value)}
                            format={(v) => `+${v.toFixed(0)} score advantage`}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={handleMatch} disabled={isMatched} className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 p-2 rounded">Perform Matching</button>
                            <button onClick={handleReset} disabled={!isMatched} className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 p-2 rounded">Reset Matches</button>
                        </div>
                         <button onClick={regenerateData} className="w-full mt-3 bg-slate-700 hover:bg-slate-600 p-2 rounded">Regenerate Data</button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Imagine students can choose whether to use a new AI tutor (Treatment) or stick with the old system (Control). Motivated students are more likely to choose the new tutor, creating selection bias. PSM allows us to compare outcomes by matching a student who chose the tutor with a student who didn't, but who was just as motivated (i.e., had a similar "propensity" or prior score).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PSMAnalysis;