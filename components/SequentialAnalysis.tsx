import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ValueTimePoint } from '../types';
import { generateTimeSeriesData, calculateMovingAverage } from '../services/statisticsService';
import { getTimeSeriesExplanation } from '../services/geminiService';
import LineChart from './LineChart';
import GeminiExplanation from './GeminiExplanation';

interface TimeSeriesAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
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
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

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
    
    const analyzePattern = useCallback(async () => {
        setIsLoading(true);
        // Ask Gemini to analyze the middle part of the data to get a representative sample
        const analysisSlice = data.slice(Math.floor(data.length / 4), Math.floor(data.length * 3 / 4)).map(p => p.value);
        const exp = await getTimeSeriesExplanation(analysisSlice);
        setExplanation(exp);
        setIsLoading(false);
    }, [data]);

    // Initial explanation
    useEffect(() => {
        analyzePattern();
    }, []);

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
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Analyze student engagement over a semester. The X-axis could be 'Weeks into the Course' and the Y-axis 'Average Forum Posts per Student.' A moving average smooths weekly noise to reveal the overall trend. Is engagement increasing towards mid-terms, or is there a slow decline that warrants an intervention?
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TimeSeriesAnalysis;
