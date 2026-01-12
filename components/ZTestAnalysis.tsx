
import React, { useState, useEffect, useMemo } from 'react';
import { DistributionParams } from '../types';
import { calculateZTest, calculateMean2ForPValue } from '../services/statisticsService';
import { getPValueExplanation } from '../services/geminiService';
import { logEvent } from '../services/loggingService';
import DistributionChart from './DistributionChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { getChatResponse } from '../services/geminiService';

interface ZTestAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
    moduleId?: string;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onMouseUp?: () => void }> = ({ label, value, min, max, step, onChange, onMouseUp }) => (
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
            onMouseUp={onMouseUp}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const ZTestAnalysis: React.FC<ZTestAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [dist1, setDist1] = useState<DistributionParams>({ mean: 45, stdDev: 10, size: 100 });
    const [dist2, setDist2] = useState<DistributionParams>({ mean: 55, stdDev: 10, size: 100 });
    const [testResult, setTestResult] = useState({ zScore: 0, pValue: 1 });
    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Hello! I'm Dr. Gem. 🧪 Ready to test our hypothesis? Adjust the group means and let's check that p-value!" }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [logPValue, setLogPValue] = useState(0); // For the log-scale slider, from 0 to 4 (p=1 to 0.0001)

    const distributionsForChart = useMemo(() => [
        { mean: dist1.mean, stdDev: dist1.stdDev, color: 'rgb(34 211 238)' },
        { mean: dist2.mean, stdDev: dist2.stdDev, color: 'rgb(236 72 153)' },
    ], [dist1, dist2]);

    useEffect(() => {
        const result = calculateZTest(dist1, dist2);
        setTestResult(result);
        if (result.pValue > 0) {
            setLogPValue(Math.min(4, -Math.log10(result.pValue)));
        } else {
            setLogPValue(4); // Max value for p=0
        }
    }, [dist1, dist2]);

    // Unified Chat Handler
    const handleSendMessage = async (message: string) => {
        const newHistory = [...chatHistory, { role: 'user' as const, text: message }];
        setChatHistory(newHistory);
        setIsChatLoading(true);

        const context = `
            Current Z-Test Simulation State:
            Group 1 (Control): Mean=${dist1.mean}, StdDev=${dist1.stdDev}, Size=${dist1.size}
            Group 2 (Experimental): Mean=${dist2.mean}, StdDev=${dist2.stdDev}, Size=${dist2.size}
            Result: Z-Score=${testResult.zScore.toFixed(3)}, p-value=${testResult.pValue.toExponential(4)}
            User Context: ${customContext || 'General Z-Test Analysis'}
        `;

        try {
            const response = await getChatResponse(message, context);
            setChatHistory(prev => [...prev, { role: 'model' as const, text: response }]);
        } catch (error) {
            console.error("Chat error:", error);
            setChatHistory(prev => [...prev, { role: 'model' as const, text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handlePValueSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLogP = parseFloat(e.target.value);
        setLogPValue(newLogP);

        const targetPValue = Math.pow(10, -newLogP);

        const newMean2 = calculateMean2ForPValue(targetPValue, dist1, {
            stdDev: dist2.stdDev,
            size: dist2.size
        }, dist2.mean);

        // Clamp the value to stay within the slider's allowed range
        const clampedMean2 = Math.max(10, Math.min(90, newMean2));

        setDist2(d => ({ ...d, mean: clampedMean2 }));
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">{customTitle || "Z-Test Analysis"}</h1>
                    <p className="text-slate-400 mt-2">Compare the means of two groups and see the statistical significance.</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-cyan-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-[400px]">
                    <DistributionChart distributions={distributionsForChart} />
                </div>
                <div className="md:col-span-1 flex flex-col space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3 border-b border-cyan-400/20 pb-2">Group 1 (Cyan)</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Mean" value={dist1.mean} min={10} max={90} step={0.5} onChange={(e) => setDist1(d => ({ ...d, mean: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 1 Mean', value: dist1.mean })} />
                                <Slider label="Standard Deviation" value={dist1.stdDev} min={2} max={20} step={0.5} onChange={(e) => setDist1(d => ({ ...d, stdDev: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 1 StdDev', value: dist1.stdDev })} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-pink-500 mb-3 border-b border-pink-500/20 pb-2">Group 2 (Pink)</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Mean" value={dist2.mean} min={10} max={90} step={0.5} onChange={(e) => setDist2(d => ({ ...d, mean: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 2 Mean', value: dist2.mean })} />
                                <Slider label="Standard Deviation" value={dist2.stdDev} min={2} max={20} step={0.5} onChange={(e) => setDist2(d => ({ ...d, stdDev: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 2 StdDev', value: dist2.stdDev })} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Test Results</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Z-Score:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {testResult.zScore.toFixed(3)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">p-value:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {testResult.pValue < 0.001 && testResult.pValue !== 0 ? testResult.pValue.toExponential(2) : testResult.pValue.toFixed(4)}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <label className="flex justify-between text-sm text-slate-400" htmlFor="p-value-slider">
                                <span>Adjust p-value (moves Group 2)</span>
                            </label>
                            <input
                                id="p-value-slider"
                                type="range"
                                min={0}
                                max={4}
                                step={0.01}
                                value={logPValue}
                                onChange={handlePValueSliderChange}
                                onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'p-value_adjust', value: Math.pow(10, -logPValue) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1"
                                aria-label="Adjust p-value"
                            />
                        </div>
                    </div>

                    {/* Chat - constrained height with internal scroll */}
                    {/* Chat - fixed height to prevent clipping */}
                    <div className="h-[300px] rounded-lg">
                        <UnifiedGenAIChat
                            moduleTitle={customTitle || "Z-Test Analysis"}
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>

                </div>
            </main >
        </div >
    );
};

export default ZTestAnalysis;

