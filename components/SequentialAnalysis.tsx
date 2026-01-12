import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ValueTimePoint } from '../types';
import { generateTimeSeriesData, calculateMovingAverage } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import LineChart from './LineChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface TimeSeriesAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
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

const DATA_POINTS_COUNT = 50;

const TimeSeriesAnalysis: React.FC<TimeSeriesAnalysisProps> = ({ onBack }) => {
    const [data, setData] = useState<ValueTimePoint[]>(() => generateTimeSeriesData(DATA_POINTS_COUNT));
    const [movingAverageWindow, setMovingAverageWindow] = useState<number>(5);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Welcome to Time Series Analysis! 📈 I'm Dr. Gem. I can help you find trends and smooth out the noise." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

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

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);

        const context = `
            Time Series Analysis:
            - Data Points: ${data.length}
            - Moving Average Window: ${movingAverageWindow}
            - Data Sample (First 5): ${data.slice(0, 5).map(p => p.value.toFixed(1)).join(', ')}
            - Data Sample (Last 5): ${data.slice(-5).map(p => p.value.toFixed(1)).join(', ')}
            
            Goal: Identify trends (upward, downward, cyclic) and noise levels.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'model', text: "I'm having trouble analyzing the data right now." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const analyzePattern = () => {
        handleSendMessage("Analyze the current time series pattern. Is there a trend?");
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-lime-400 hover:text-lime-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-lime-400">Time Series Analysis</h1>
                    <p className="text-slate-400 mt-2">Visualize time-series data, smooth it out, and find hidden patterns.</p>
                </div>
            </header>

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
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        variant="embedded"
                    />
                </div>
            </main>
        </div>
    );
};

export default TimeSeriesAnalysis;

