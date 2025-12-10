import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GroupPoint, RegressionLine } from '../types';
import { generateMultiLevelData, calculateLinearRegression } from '../services/statisticsService';
import { getMultiLevelExplanation } from '../services/geminiService';
import MultiLevelScatterPlot from './MultiLevelScatterPlot';
import GeminiExplanation from './GeminiExplanation';

interface MultiLevelAnalysisProps {
    onBack: () => void;
}

// Reusable Slider component
const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, unit?: string}> = ({ label, value, min, max, step, onChange, unit }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(2)}{unit}</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const NUM_GROUPS = 4;
const POINTS_PER_GROUP = 25;
const GROUP_COLORS = ['rgb(34 211 238)', 'rgb(236 72 153)', 'rgb(163 230 53)', 'rgb(251 146 60)']; // Cyan, Pink, Lime, Orange

const MultiLevelAnalysis: React.FC<MultiLevelAnalysisProps> = ({ onBack }) => {
    const [fixedIntercept, setFixedIntercept] = useState(20);
    const [fixedSlope, setFixedSlope] = useState(0.6);
    const [interceptVariance, setInterceptVariance] = useState(100); // How much group intercepts vary
    const [slopeVariance, setSlopeVariance] = useState(0.2); // How much group slopes vary

    const [data, setData] = useState<GroupPoint[]>([]);
    const [overallLine, setOverallLine] = useState<RegressionLine>({ slope: 0, intercept: 0 });
    const [groupLines, setGroupLines] = useState<(RegressionLine & { groupId: number })[]>([]);

    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const regenerateData = useCallback(() => {
        const newData = generateMultiLevelData(
            NUM_GROUPS, POINTS_PER_GROUP,
            fixedIntercept, fixedSlope,
            interceptVariance, slopeVariance
        );
        setData(newData);

        // Calculate regression lines
        setOverallLine(calculateLinearRegression(newData));
        const newGroupLines = Array.from({ length: NUM_GROUPS }, (_, i) => {
            const groupData = newData.filter(p => p.groupId === i);
            const line = calculateLinearRegression(groupData);
            return { ...line, groupId: i };
        });
        setGroupLines(newGroupLines);
    }, [fixedIntercept, fixedSlope, interceptVariance, slopeVariance]);

    // Initial data generation and parameter change handler
    useEffect(() => {
        regenerateData();
    }, [fixedIntercept, fixedSlope, interceptVariance, slopeVariance, regenerateData]);


    // Debounced explanation fetching
    useEffect(() => {
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getMultiLevelExplanation(fixedSlope, interceptVariance, slopeVariance);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [fixedSlope, interceptVariance, slopeVariance]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-teal-400 hover:text-teal-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-teal-400">Multi-level Modeling</h1>
                    <p className="text-slate-400 mt-2">Explore how overall trends and group-specific variations interact.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <MultiLevelScatterPlot data={data} overallLine={overallLine} groupLines={groupLines} groupColors={GROUP_COLORS} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-teal-400 mb-3 border-b border-teal-400/20 pb-2">Model Parameters</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Overall Intercept" value={fixedIntercept} min={-50} max={50} step={1} onChange={(e) => setFixedIntercept(+e.target.value)} />
                                <Slider label="Overall Slope" value={fixedSlope} min={-1.5} max={1.5} step={0.05} onChange={(e) => setFixedSlope(+e.target.value)} />
                                <Slider label="Group Intercept Variance" value={interceptVariance} min={0} max={400} step={5} onChange={(e) => setInterceptVariance(+e.target.value)} />
                                <Slider label="Group Slope Variance" value={slopeVariance} min={0} max={1} step={0.01} onChange={(e) => setSlopeVariance(+e.target.value)} />
                            </div>
                        </div>
                        <button onClick={regenerateData} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                           Regenerate Data
                        </button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    You are studying the effect of a new teaching strategy on students' math scores across different schools. Student performance is influenced by individual factors, but also by their classroom and school environments. Multi-level models account for this nested structure, allowing you to correctly estimate the teaching strategy's true effect while considering the variations between schools.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MultiLevelAnalysis;