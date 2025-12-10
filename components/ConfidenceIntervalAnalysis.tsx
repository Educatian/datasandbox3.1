
import React, { useState, useEffect, useCallback } from 'react';
import { ConfidenceInterval } from '../types';
import { generateSampleData, calculateConfidenceInterval } from '../services/statisticsService';
import { getConfidenceIntervalExplanation } from '../services/geminiService';
import ConfidenceIntervalChart from './ConfidenceIntervalChart';
import GeminiExplanation from './GeminiExplanation';

interface ConfidenceIntervalAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
}

const POPULATION_MEAN = 50;
const POPULATION_STD_DEV = 15;

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, unit?: string}> = ({ label, value, min, max, step, onChange, unit }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}{unit}</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const ConfidenceIntervalAnalysis: React.FC<ConfidenceIntervalAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [confidenceLevel, setConfidenceLevel] = useState(95);
    const [sampleSize, setSampleSize] = useState(30);
    const [intervals, setIntervals] = useState<ConfidenceInterval[]>([]);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const runSimulation = useCallback((count: number) => {
        const newIntervals: ConfidenceInterval[] = [];
        for (let i = 0; i < count; i++) {
            const sample = generateSampleData(POPULATION_MEAN, POPULATION_STD_DEV, sampleSize);
            const { sampleMean, lowerBound, upperBound } = calculateConfidenceInterval(sample, confidenceLevel);
            const captured = lowerBound <= POPULATION_MEAN && upperBound >= POPULATION_MEAN;
            newIntervals.push({ id: Date.now() + i, sampleMean, lowerBound, upperBound, captured });
        }
        setIntervals(prev => [...prev, ...newIntervals]);
    }, [sampleSize, confidenceLevel]);
    
    const resetSimulations = () => {
        setIntervals([]);
    };

    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getConfidenceIntervalExplanation(confidenceLevel);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [confidenceLevel]);

    const stats = React.useMemo(() => {
        const total = intervals.length;
        if (total === 0) return { total: 0, captured: 0, percentage: 0 };
        const capturedCount = intervals.filter(i => i.captured).length;
        return {
            total,
            captured: capturedCount,
            percentage: (capturedCount / total) * 100
        };
    }, [intervals]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-400">{customTitle || "Confidence Intervals"}</h1>
                    <p className="text-slate-400 mt-2">Simulate sampling to see how often the interval captures the true population mean.</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-indigo-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                     <ConfidenceIntervalChart 
                        intervals={intervals}
                        populationMean={POPULATION_MEAN}
                     />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                         <div>
                            <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-indigo-400/20 pb-2">Simulation Controls</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Confidence Level" value={confidenceLevel} min={80} max={99} step={1} onChange={(e) => setConfidenceLevel(+e.target.value)} unit="%" />
                                <Slider label="Sample Size (n)" value={sampleSize} min={5} max={200} step={1} onChange={(e) => setSampleSize(+e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => runSimulation(1)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">Resample</button>
                            <button onClick={() => runSimulation(100)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">Run 100 Samples</button>
                        </div>
                         <button onClick={resetSimulations} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Reset
                        </button>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                         <h3 className="text-lg font-semibold text-indigo-400 mb-3">Results</h3>
                         <div className="flex justify-between items-center">
                             <span className="text-slate-300">Total Samples:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {stats.total}
                            </span>
                         </div>
                         <div className="flex justify-between items-center mt-2">
                             <span className="text-slate-300">Intervals Capturing Mean:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {stats.captured} ({stats.percentage.toFixed(1)}%)
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
                                    After a pilot study of a new educational game with 50 students, you find their average engagement time was 20 minutes. A confidence interval gives you a range (e.g., 18 to 22 minutes) where the true average engagement time for the entire student population likely lies. It helps you report the precision of your findings and understand the uncertainty of your sample estimate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ConfidenceIntervalAnalysis;
