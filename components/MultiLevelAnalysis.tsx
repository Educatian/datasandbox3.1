import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GroupPoint, RegressionLine } from '../types';
import { generateMultiLevelData, calculateLinearRegression } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import MultiLevelScatterPlot from './MultiLevelScatterPlot';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface MultiLevelAnalysisProps {
    onBack: () => void;
}

// Reusable Slider component
const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, unit?: string }> = ({ label, value, min, max, step, onChange, unit }) => (
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

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can help you understand Multi-level Modeling. Adjust the variances to see how group-level effects differ from the overall trend!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

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

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are analyzing Multi-level Modeling.
            Fixed Slope (Overall): ${fixedSlope}
            Intercept Variance: ${interceptVariance}
            Slope Variance: ${slopeVariance}
            
            User Question: ${msg}
            
            Explain how the group-level variations affect the interpretation of the overall trend.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the multi-level effects right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Multi-level Modeling"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
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

export default MultiLevelAnalysis;
