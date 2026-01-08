import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DistributionParams } from '../types';
import { calculateAnova } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import DistributionChart from './DistributionChart';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface AnovaAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
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
            <Slider label="Mean" value={params.mean} min={10} max={90} step={0.5} onChange={(e) => setParams(p => ({ ...p, mean: +e.target.value }))} />
            <Slider label="Standard Deviation" value={params.stdDev} min={2} max={20} step={0.5} onChange={(e) => setParams(p => ({ ...p, stdDev: +e.target.value }))} />
            <Slider label="Sample Size (n)" value={params.size} min={5} max={200} step={1} onChange={(e) => setParams(p => ({ ...p, size: +e.target.value }))} />
        </div>
    </div>
);


const AnovaAnalysis: React.FC<AnovaAnalysisProps> = ({ onBack }) => {
    const [group1, setGroup1] = useState<DistributionParams>({ mean: 40, stdDev: 8, size: 50 });
    const [group2, setGroup2] = useState<DistributionParams>({ mean: 50, stdDev: 8, size: 50 });
    const [group3, setGroup3] = useState<DistributionParams>({ mean: 60, stdDev: 8, size: 50 });

    const [anovaResult, setAnovaResult] = useState({ fStatistic: 0, pValue: 1 });

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you interpret these ANOVA results. Try adjusting the group means to see how the F-statistic changes!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const distributionsForChart = useMemo(() => [
        { mean: group1.mean, stdDev: group1.stdDev, color: 'rgb(34 211 238)' },  // Cyan
        { mean: group2.mean, stdDev: group2.stdDev, color: 'rgb(236 72 153)' }, // Pink
        { mean: group3.mean, stdDev: group3.stdDev, color: 'rgb(163 230 53)' }, // Lime
    ], [group1, group2, group3]);

    useEffect(() => {
        const result = calculateAnova([group1, group2, group3]);
        setAnovaResult(result);
    }, [group1, group2, group3]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are performing a One-Way ANOVA test.
            Group 1 (Cyan): Mean=${group1.mean}, SD=${group1.stdDev}, N=${group1.size}
            Group 2 (Pink): Mean=${group2.mean}, SD=${group2.stdDev}, N=${group2.size}
            Group 3 (Lime): Mean=${group3.mean}, SD=${group3.stdDev}, N=${group3.size}
            
            Current Results:
            F-Statistic: ${anovaResult.fStatistic.toFixed(3)}
            P-Value: ${anovaResult.pValue.toFixed(5)}
            
            User Question: ${msg}
            
            Explain the relationship between the group separation (between-group variance) and the spread within groups (within-group variance) and how that determines the F-statistic.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the variance right now.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [group1, group2, group3, anovaResult]);

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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="ANOVA Analysis"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnovaAnalysis;