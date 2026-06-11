
import React, { useState, useEffect, useCallback } from 'react';
import { ConfidenceInterval } from '../types';
import { generateSampleData, calculateConfidenceInterval } from '../services/statisticsService';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import PredictGate from './ui/PredictGate';
import ConfidenceIntervalChart from './ConfidenceIntervalChart';
import Slider from './ui/Slider';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface ConfidenceIntervalAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
}

const POPULATION_MEAN = 50;
const POPULATION_STD_DEV = 15;

const ConfidenceIntervalAnalysis: React.FC<ConfidenceIntervalAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [confidenceLevel, setConfidenceLevel] = useState(95);
    const [sampleSize, setSampleSize] = useState(30);
    const [intervals, setIntervals] = useState<ConfidenceInterval[]>([]);

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

    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Welcome. This is Dr. Gem. 🧬 Here we test how 'Confident' we can be that our sample represents the truth. Try running 100 samples!",
        () => `
            You are Dr. Gem, explaining Confidence Intervals.
            Current Simulation State:
            - Confidence Level: ${confidenceLevel}%
            - Sample Size: ${sampleSize}
            - Total Samples Run: ${stats.total}
            - Percentage Capturing Mean: ${stats.percentage.toFixed(1)}% (Target: ${confidenceLevel}%)

            Educational Goal:
            - Explain that higher confidence = wider intervals.
            - Explain that larger samples = narrower intervals (more precision).
            - Explain that "95% confidence" means 95 out of 100 random intervals will capture the true mean in the long run.
        `
    );

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

            <PredictGate
                predictionId="ci-meaning"
                question="You pump the sample size from n = 5 up to n = 100. What happens to (a) the spread of the raw data and (b) the width of the 95% CI for the mean?"
                options={[
                    { id: 'ci_narrows', label: 'Raw data spread stays roughly the same, but the CI narrows sharply', correct: true },
                    { id: 'both_wider', label: 'Both get wider: more values means more variability to cover', misconception: 'larger_n_more_variable' },
                    { id: 'ci_tracks_data', label: 'Both stay matched: the CI has to keep covering 95% of the data points', misconception: 'ci_contains_data' },
                    { id: 'both_shrink', label: 'Both shrink together: bigger samples tame the data and the interval' }
                ]}
                watchFor="Run 100 samples at n = 5, then slide Sample Size (n) up to 100 and run 100 more: compare the interval widths, and remember the population SD never changed."
            >
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
                                <Slider label="Confidence Level" value={confidenceLevel} min={80} max={99} step={1} onChange={(e) => setConfidenceLevel(+e.target.value)} format={(v) => `${v.toFixed(0)}%`} />
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
                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle={customTitle || "Confidence Intervals"}
                            history={chatHistory}
                            onSendMessage={sendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
            </PredictGate>
        </div>
    );
};

export default ConfidenceIntervalAnalysis;

