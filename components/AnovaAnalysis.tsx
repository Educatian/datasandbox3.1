import React, { useState, useEffect, useMemo } from 'react';
import { DistributionParams } from '../types';
import { calculateAnova } from '../services/statisticsService';
import { getAnovaPValueExplanation } from '../services/geminiService';
import DistributionChart from './DistributionChart';
import GeminiExplanation from './GeminiExplanation';

interface AnovaAnalysisProps {
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

const GroupControls: React.FC<{
    title: string;
    colorClass: string;
    params: DistributionParams;
    setParams: React.Dispatch<React.SetStateAction<DistributionParams>>;
}> = ({ title, colorClass, params, setParams }) => (
    <div>
        <h3 className={`text-lg font-semibold ${colorClass} mb-3 border-b ${colorClass.replace('text-', 'border-')}/20 pb-2`}>{title}</h3>
        <div className="space-y-4 mt-3">
            <Slider label="Mean" value={params.mean} min={10} max={90} step={0.5} onChange={(e) => setParams(p => ({...p, mean: +e.target.value}))} />
            <Slider label="Standard Deviation" value={params.stdDev} min={2} max={20} step={0.5} onChange={(e) => setParams(p => ({...p, stdDev: +e.target.value}))} />
            <Slider label="Sample Size (n)" value={params.size} min={5} max={200} step={1} onChange={(e) => setParams(p => ({...p, size: +e.target.value}))} />
        </div>
    </div>
);


const AnovaAnalysis: React.FC<AnovaAnalysisProps> = ({ onBack }) => {
    const [group1, setGroup1] = useState<DistributionParams>({ mean: 40, stdDev: 8, size: 50 });
    const [group2, setGroup2] = useState<DistributionParams>({ mean: 50, stdDev: 8, size: 50 });
    const [group3, setGroup3] = useState<DistributionParams>({ mean: 60, stdDev: 8, size: 50 });
    
    const [anovaResult, setAnovaResult] = useState({ fStatistic: 0, pValue: 1 });
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const distributionsForChart = useMemo(() => [
        { mean: group1.mean, stdDev: group1.stdDev, color: 'rgb(34 211 238)' },  // Cyan
        { mean: group2.mean, stdDev: group2.stdDev, color: 'rgb(236 72 153)' }, // Pink
        { mean: group3.mean, stdDev: group3.stdDev, color: 'rgb(163 230 53)' }, // Lime
    ], [group1, group2, group3]);

    useEffect(() => {
        const result = calculateAnova([group1, group2, group3]);
        setAnovaResult(result);
    }, [group1, group2, group3]);

    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getAnovaPValueExplanation(anovaResult.pValue, 3);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [anovaResult.pValue]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">ANOVA Analysis</h1>
                    <p className="text-slate-400 mt-2">Compare the means of multiple groups to see if they differ significantly.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <DistributionChart distributions={distributionsForChart} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <GroupControls title="Group 1 (Cyan)" colorClass="text-cyan-400" params={group1} setParams={setGroup1} />
                        <GroupControls title="Group 2 (Pink)" colorClass="text-pink-500" params={group2} setParams={setGroup2} />
                        <GroupControls title="Group 3 (Lime)" colorClass="text-lime-400" params={group3} setParams={setGroup3} />
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                         <h3 className="text-lg font-semibold text-cyan-400 mb-3">Test Results</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">F-Statistic:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {anovaResult.fStatistic.toFixed(3)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">p-value:</span>
                             <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {anovaResult.pValue < 0.001 && anovaResult.pValue !== 0 ? anovaResult.pValue.toExponential(2) : anovaResult.pValue.toFixed(4)}
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
                                    You are comparing the final exam scores of students who used one of three different online learning platforms (Platform A, B, C). ANOVA can tell you if there is a statistically significant difference in the average scores among the three groups. If the p-value is low, it suggests that the choice of platform has a real effect on student performance, prompting further investigation to see which platform is best.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnovaAnalysis;