import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ValueTimePoint } from '../types';
import { generateTimeSeriesData, calculateMovingAverage } from '../services/statisticsService';
import LineChart from './LineChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import ModuleShell from './ui/ModuleShell';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface TimeSeriesAnalysisProps {
    onBack: () => void;
}

const DATA_POINTS_COUNT = 50;

const TimeSeriesAnalysis: React.FC<TimeSeriesAnalysisProps> = ({ onBack }) => {
    const [data, setData] = useState<ValueTimePoint[]>(() => generateTimeSeriesData(DATA_POINTS_COUNT));
    const [movingAverageWindow, setMovingAverageWindow] = useState<number>(5);

    // Chat State
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Welcome to Time Series Analysis! 📈 I'm Dr. Gem. I can help you find trends and smooth out the noise.",
        () => `
            Time Series Analysis:
            - Data Points: ${data.length}
            - Moving Average Window: ${movingAverageWindow}
            - Data Sample (First 5): ${data.slice(0, 5).map(p => p.value.toFixed(1)).join(', ')}
            - Data Sample (Last 5): ${data.slice(-5).map(p => p.value.toFixed(1)).join(', ')}

            Goal: Identify trends (upward, downward, cyclic) and noise levels.
        `
    );

    const movingAverageData = useMemo(() => {
        return calculateMovingAverage(data, movingAverageWindow);
    }, [data, movingAverageWindow]);

    const handlePointUpdate = useCallback((id: number, newValue: number) => {
        setData(prevData =>
            prevData.map(p => (p.id === id ? { ...p, value: newValue } : p))
        );
    }, []);

    const resetData = () => {
        setData(generateTimeSeriesData(DATA_POINTS_COUNT));
    };

    const analyzePattern = () => {
        sendMessage("Analyze the current time series pattern. Is there a trend?");
    };

    return (
        <ModuleShell
            title="Time Series Analysis"
            subtitle="Visualize time-series data, smooth it out, and find hidden patterns."
            accentClass="text-lime-400"
            backClass="text-lime-400 hover:text-lime-300"
            onBack={onBack}
        >
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <LineChart data={data} movingAverageData={movingAverageData} onPointUpdate={handlePointUpdate} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-lime-400 mb-3">Controls</h3>
                        <div className="space-y-4">
                            <Slider
                                label="Moving Average Window"
                                value={movingAverageWindow}
                                min={1} max={20} step={1}
                                onChange={(e) => setMovingAverageWindow(+e.target.value)}
                            />
                            <div className="flex space-x-2 pt-2">
                                <button
                                    onClick={resetData}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Reset Data
                                </button>
                                <button
                                    onClick={analyzePattern}
                                    className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Analyze Pattern
                                </button>
                            </div>
                        </div>
                    </div>
                    <UnifiedGenAIChat
                        moduleTitle="Time Series Analysis"
                        history={chatHistory}
                        onSendMessage={sendMessage}
                        isLoading={isChatLoading}
                        variant="embedded"
                    />
                </div>
            </main>
        </ModuleShell>
    );
};

export default TimeSeriesAnalysis;

