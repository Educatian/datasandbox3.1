import React, { useState, useEffect, useCallback } from 'react';
import { Point, RegressionLine } from '../types';
import { calculateCorrelation, calculateLinearRegression, generateCorrelatedData } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import ScatterPlot from './ScatterPlot';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';
import ReactionTimeVisualizer from './ReactionTimeVisualizer';

interface CorrelationAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(2)}</span>
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

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [scenario, setScenario] = useState<'abstract' | 'experiment'>('abstract');
    const [points, setPoints] = useState<Point[]>([]);
    const [correlation, setCorrelation] = useState<number>(0);
    const [regressionLine, setRegressionLine] = useState<RegressionLine>({ slope: 0, intercept: 0 });

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you analyze the correlation between these variables. Generate some data or run an experiment to get started!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Abstract Mode State
    const [targetCorrelation, setTargetCorrelation] = useState(0.8);
    const [spread, setSpread] = useState(15);

    // Experiment Mode State
    const [distractionLevel, setDistractionLevel] = useState(10);

    const generateAbstractData = useCallback(() => {
        const data = generateCorrelatedData(30, targetCorrelation, spread);
        setPoints(data);
    }, [targetCorrelation, spread]);

    useEffect(() => {
        if (scenario === 'abstract') {
            generateAbstractData();
            setChatHistory(prev => [...prev, { text: "I've generated some abstract data. Adjust the correlation slider to see how the scatter plot changes.", sender: 'bot' }]);
        } else {
            setPoints([]); // Clear for experiment
            setChatHistory(prev => [...prev, { text: "We're running a Reaction Time experiment now. Set the distraction level and click 'Measure Reaction' to collect data points.", sender: 'bot' }]);
        }
    }, [scenario, generateAbstractData]);

    useEffect(() => {
        const corr = calculateCorrelation(points);
        const line = calculateLinearRegression(points);
        setCorrelation(corr);
        setRegressionLine(line);
    }, [points]);

    const handleExperimentTest = () => {
        // X: Distraction Level (0-100)
        // Y: Reaction Time (Simulated 0-100 scale)
        // Higher Distraction -> Higher Reaction Time (Positive Correlation)
        const baseReaction = 20;
        const effect = 0.6 * distractionLevel;
        const noise = (Math.random() - 0.5) * 40; // Individual variability

        let reactionTime = baseReaction + effect + noise;
        reactionTime = Math.max(5, Math.min(95, reactionTime));

        const newPoint: Point = {
            id: Date.now(),
            x: distractionLevel + (Math.random() - 0.5) * 5, // Slight jitter in x
            y: reactionTime
        };

        setPoints(prev => [...prev, newPoint]);
    };

    const handlePointUpdate = useCallback((id: number, newX: number, newY: number) => {
        setPoints(prevPoints =>
            prevPoints.map(p => (p.id === id ? { ...p, x: newX, y: newY } : p))
        );
    }, []);

    const getCorrelationStrength = (r: number) => {
        const abs = Math.abs(r);
        if (abs < 0.1) return "No Correlation";
        const direction = r > 0 ? "Positive" : "Negative";
        if (abs < 0.3) return `Weak ${direction}`;
        if (abs < 0.7) return `Moderate ${direction}`;
        return `Strong ${direction}`;
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are analyzing Correlation.
            Scenario: ${scenario === 'abstract' ? 'Abstract Data' : 'Reaction Time Experiment (Distraction vs. Reaction)'}
            Number of points: ${points.length}
            Correlation Coefficient (r): ${correlation.toFixed(3)}
            Correlation Strength: ${getCorrelationStrength(correlation)}
            Regression Line: y = ${regressionLine.slope.toFixed(2)}x + ${regressionLine.intercept.toFixed(2)}
            
            User Question: ${msg}
            
            Explain the strength and direction of the relationship.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the correlation right now.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [points, correlation, regressionLine, scenario]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">{customTitle || "Correlation Analysis"}</h1>
                    <p className="text-slate-400 mt-2">{scenario === 'experiment' ? "Cognitive Experiment: Distraction vs. Reaction Time" : "Explore linear relationships between variables."}</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-cyan-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <div className="flex justify-center mb-6">
                <div className="bg-slate-800 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setScenario('abstract')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'abstract' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Abstract Data
                    </button>
                    <button
                        onClick={() => setScenario('experiment')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'experiment' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        🧠 Reaction Experiment
                    </button>
                </div>
            </div>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Visualizer (Experiment Mode) - Only visible in experiment mode */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-3' : 'hidden'} bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col items-center`}>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4">Experimental Setup</h3>
                    <ReactionTimeVisualizer distractionLevel={distractionLevel} onTest={handleExperimentTest} />
                    <div className="w-full mt-6 px-2 space-y-4">
                        <h4 className="text-sm font-semibold text-slate-300">Independent Variable</h4>
                        <Slider label="Distraction Level" value={distractionLevel} min={0} max={100} step={5} onChange={(e) => setDistractionLevel(+e.target.value)} />
                    </div>
                </div>

                {/* Center Panel: Scatter Plot */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-6' : 'lg:col-span-8'} bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-[500px]`}>
                    <ScatterPlot
                        data={points}
                        line={regressionLine}
                        onPointUpdate={handlePointUpdate}
                        xAxisLabel={scenario === 'experiment' ? "Distraction Level" : "Variable X"}
                        yAxisLabel={scenario === 'experiment' ? "Reaction Time (ms)" : "Variable Y"}
                    />
                </div>

                {/* Right Panel: Controls & Metrics */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col space-y-8`}>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Data Controls</h3>

                        {scenario === 'abstract' && (
                            <div className="space-y-4 animate-fade-in">
                                <Slider label="Target Correlation (r)" value={targetCorrelation} min={-1} max={1} step={0.1} onChange={(e) => setTargetCorrelation(+e.target.value)} />
                                <Slider label="Noise / Spread" value={spread} min={1} max={40} step={1} onChange={(e) => setSpread(+e.target.value)} />
                                <button
                                    onClick={generateAbstractData}
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Generate New Data
                                </button>
                            </div>
                        )}
                        {scenario === 'experiment' && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-slate-400">
                                    Perform trials at different distraction levels to build your dataset.
                                </p>
                                <button
                                    onClick={() => setPoints([])}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Reset Experiment
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Statistics</h3>
                        <div className="flex flex-col mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Correlation (r):</span>
                                <span className="text-2xl font-mono bg-slate-900 px-3 py-1 rounded text-cyan-400">
                                    {correlation.toFixed(3)}
                                </span>
                            </div>
                            <div className="text-right mt-1 text-sm text-slate-400 font-medium">
                                {points.length > 1 ? getCorrelationStrength(correlation) : "Add points"}
                            </div>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Correlation Analysis"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                        />
                    </div>
                </div>
            </main>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default CorrelationAnalysis;
