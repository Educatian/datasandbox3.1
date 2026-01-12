import React, { useState, useEffect, useCallback } from 'react';
import { RddPoint, RddResult } from '../types';
import { generateRddData, calculateRddEffect } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import RddPlot from './RddPlot';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface RddAnalysisProps {
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

const TRUE_EFFECT = 20;
const INITIAL_CUTOFF = 50;

const RddAnalysis: React.FC<RddAnalysisProps> = ({ onBack }) => {
    const [cutoff, setCutoff] = useState(INITIAL_CUTOFF);
    const [bandwidth, setBandwidth] = useState(15);
    const [data, setData] = useState<RddPoint[]>([]);
    const [rddResult, setRddResult] = useState<RddResult | null>(null);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can explain how Regression Discontinuity Design works. Try changing the cutoff or bandwidth to see how the estimated effect changes!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const regenerateData = useCallback(() => {
        // We generate data based on the initial cutoff to have a consistent "true" model
        const newData = generateRddData(INITIAL_CUTOFF, TRUE_EFFECT, 200);
        setData(newData);
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    useEffect(() => {
        const result = calculateRddEffect(data, cutoff, bandwidth);
        setRddResult(result);
    }, [data, cutoff, bandwidth]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are analyzing Regression Discontinuity Design (RDD).
            Current Cutoff Score: ${cutoff}
            Bandwidth: ${bandwidth}
            Estimated Local Average Treatment Effect (LATE): ${rddResult?.effect.toFixed(2) || 'N/A'}
            True Effect Size: ${TRUE_EFFECT}
            
            User Question: ${msg}
            
            Explain how the 'jump' at the cutoff allows for causal inference despite non-random assignment.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the regression discontinuity.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [cutoff, bandwidth, rddResult]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">Regression Discontinuity Design</h1>
                    <p className="text-slate-400 mt-2">Estimate an intervention's causal effect by analyzing the "jump" at a cutoff point.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    {rddResult && <RddPlot data={data} result={rddResult} cutoff={cutoff} bandwidth={bandwidth} />}
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Analysis Controls</h3>
                        <div className="space-y-4">
                            <Slider label="Cutoff Score" value={cutoff} min={20} max={80} step={1} onChange={e => setCutoff(+e.target.value)} />
                            <Slider label="Bandwidth" value={bandwidth} min={5} max={50} step={1} onChange={e => setBandwidth(+e.target.value)} />
                        </div>
                        <button onClick={regenerateData} className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-3">Estimated Effect</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">"Jump" at Cutoff:</span>
                            <span className="text-2xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {rddResult?.effect.toFixed(2) || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Regression Discontinuity Design"
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

export default RddAnalysis;
