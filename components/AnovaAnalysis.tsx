import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DistributionParams } from '../types';
import { calculateAnova } from '../services/statisticsService';
import DistributionChart from './DistributionChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import DataContextCard from './ui/DataContextCard';
import { useGeminiChat } from '../hooks/useGeminiChat';
import { getDataset, GroupedDataset } from '../data/realDatasets';

interface AnovaAnalysisProps {
    onBack: () => void;
}

// Slider ranges for the sandbox controls.
const MEAN_MIN = 10, MEAN_MAX = 90;
const SD_MIN = 2, SD_MAX = 20;
const N_MIN = 5, N_MAX = 200;

const REAL_DATA_OPTIONS = [
    { id: 'penguins-flipper-by-species', label: 'Penguin Flippers by Species' },
    { id: 'michelson-speed', label: "Michelson's Speed of Light (first 3 experiments)" },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const mean = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;
const sampleSd = (vals: number[]) => {
    if (vals.length < 2) return 0;
    const m = mean(vals);
    return Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (vals.length - 1));
};

const GroupControls: React.FC<{
    title: string;
    colorClass: string;
    borderClass: string;
    params: DistributionParams;
    setParams: React.Dispatch<React.SetStateAction<DistributionParams>>;
}> = ({ title, colorClass, borderClass, params, setParams }) => (
    <div>
        <h3 className={`text-lg font-semibold ${colorClass} mb-3 border-b ${borderClass} pb-2`}>{title}</h3>
        <div className="space-y-4 mt-3">
            <Slider label="Mean" value={params.mean} min={MEAN_MIN} max={MEAN_MAX} step={0.5} onChange={(e) => setParams(p => ({ ...p, mean: +e.target.value }))} />
            <Slider label="Standard Deviation" value={params.stdDev} min={SD_MIN} max={SD_MAX} step={0.5} onChange={(e) => setParams(p => ({ ...p, stdDev: +e.target.value }))} />
            <Slider label="Sample Size (n)" value={params.size} min={N_MIN} max={N_MAX} step={1} onChange={(e) => setParams(p => ({ ...p, size: +e.target.value }))} format={v => v.toFixed(1)} />
        </div>
    </div>
);


const AnovaAnalysis: React.FC<AnovaAnalysisProps> = ({ onBack }) => {
    const [group1, setGroup1] = useState<DistributionParams>({ mean: 40, stdDev: 8, size: 50 });
    const [group2, setGroup2] = useState<DistributionParams>({ mean: 50, stdDev: 8, size: 50 });
    const [group3, setGroup3] = useState<DistributionParams>({ mean: 60, stdDev: 8, size: 50 });

    const [anovaResult, setAnovaResult] = useState({ fStatistic: 0, pValue: 1 });

    // Real-data mode
    const [selectedRealId, setSelectedRealId] = useState<string>(REAL_DATA_OPTIONS[0].id);
    const [loadedRealId, setLoadedRealId] = useState<string | null>(null);

    const realDataset = loadedRealId ? (getDataset(loadedRealId) as GroupedDataset | undefined) : undefined;
    const groupLabels = realDataset
        ? realDataset.groups.slice(0, 3).map(g => g.label)
        : ['Group 1', 'Group 2', 'Group 3'];

    // Chat state
    const { chatHistory, isChatLoading, sendMessage, addBotMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can help you interpret these ANOVA results. Try adjusting the group means, or load a real dataset to compare real groups!",
        () => `
            We are performing a One-Way ANOVA test.
            ${realDataset ? `REAL dataset: ${realDataset.name} (${realDataset.xLabel}, ${realDataset.unitX}; ${realDataset.source}). Context: ${realDataset.contextNote} The group parameters below were computed from the real groups after one shared linear rescale into the sandbox's 10-90 scale; F and p are unaffected by a shared linear rescale. Ground every explanation in the real groups being compared.` : ''}
            ${groupLabels[0]} (Cyan): Mean=${group1.mean}, SD=${group1.stdDev}, N=${group1.size}
            ${groupLabels[1]} (Pink): Mean=${group2.mean}, SD=${group2.stdDev}, N=${group2.size}
            ${groupLabels[2]} (Lime): Mean=${group3.mean}, SD=${group3.stdDev}, N=${group3.size}

            Current Results:
            F-Statistic: ${anovaResult.fStatistic.toFixed(3)}
            P-Value: ${anovaResult.pValue.toFixed(5)}

            Explain the relationship between the group separation (between-group variance) and the spread within groups (within-group variance) and how that determines the F-statistic.
        `
    );

    const loadRealData = useCallback((id: string) => {
        const ds = getDataset(id) as GroupedDataset | undefined;
        if (!ds || ds.kind !== 'grouped') return;
        const groups = ds.groups.slice(0, 3);
        // Real values (penguin flippers ~172-231 mm, Michelson ~620-1070) sit far
        // above the mean slider's 10-90 range, so apply ONE shared linear rescale
        // to all values before computing each group's mean and SD. A linear
        // transform shared by all groups leaves F and p unchanged.
        const all = groups.flatMap(g => g.values);
        const lo = Math.min(...all), hi = Math.max(...all);
        const toSandbox = (v: number) =>
            hi === lo ? (MEAN_MIN + MEAN_MAX) / 2 : MEAN_MIN + ((v - lo) / (hi - lo)) * (MEAN_MAX - MEAN_MIN);
        const setters = [setGroup1, setGroup2, setGroup3];
        groups.forEach((g, i) => {
            const vals = g.values.map(toSandbox);
            setters[i]({
                mean: clamp(round1(mean(vals)), MEAN_MIN, MEAN_MAX),
                stdDev: clamp(round1(sampleSd(vals)), SD_MIN, SD_MAX),
                size: clamp(g.values.length, N_MIN, N_MAX),
            });
        });
        setLoadedRealId(id);
        addBotMessage(`Loaded real data: ${ds.name}. Each slider group is now seeded with the mean, SD, and n of a real group (${groups.map(g => g.label).join(', ')}). Values were rescaled to fit the sandbox scale; F and p are unaffected by linear rescaling. Is the between-group separation large compared to the spread within groups?`);
    }, [addBotMessage]);

    const distributionsForChart = useMemo(() => [
        { mean: group1.mean, stdDev: group1.stdDev, color: 'rgb(34 211 238)' },  // Cyan
        { mean: group2.mean, stdDev: group2.stdDev, color: 'rgb(236 72 153)' }, // Pink
        { mean: group3.mean, stdDev: group3.stdDev, color: 'rgb(163 230 53)' }, // Lime
    ], [group1, group2, group3]);

    useEffect(() => {
        const result = calculateAnova([group1, group2, group3]);
        setAnovaResult(result);
    }, [group1, group2, group3]);

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
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-3"><span aria-hidden="true">🌍</span> Real Data</h3>
                        <div className="space-y-4">
                            <label className="text-sm text-slate-400 block" htmlFor="anova-dataset-select">Dataset</label>
                            <select
                                id="anova-dataset-select"
                                value={selectedRealId}
                                onChange={(e) => setSelectedRealId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 outline-none"
                            >
                                {REAL_DATA_OPTIONS.map(o => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => loadRealData(selectedRealId)}
                                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                            >
                                Load Real Data
                            </button>
                            {realDataset && (
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Group sliders are seeded from the real group statistics, rescaled to fit the sandbox scale; F and p are unaffected by linear rescaling.
                                    {loadedRealId === 'michelson-speed' ? ' Showing the first 3 of 5 experiments to fit the 3-group sandbox.' : ''}
                                    {' '}Adjust the sliders to explore what-if scenarios.
                                </p>
                            )}
                        </div>
                    </div>

                    {realDataset && <DataContextCard dataset={realDataset} />}

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <GroupControls title={`${groupLabels[0]} (Cyan)`} colorClass="text-cyan-400" borderClass="border-cyan-400/20" params={group1} setParams={setGroup1} />
                        <GroupControls title={`${groupLabels[1]} (Pink)`} colorClass="text-pink-500" borderClass="border-pink-500/20" params={group2} setParams={setGroup2} />
                        <GroupControls title={`${groupLabels[2]} (Lime)`} colorClass="text-lime-400" borderClass="border-lime-400/20" params={group3} setParams={setGroup3} />
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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="ANOVA Analysis"
                            history={chatHistory}
                            onSendMessage={sendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnovaAnalysis;
