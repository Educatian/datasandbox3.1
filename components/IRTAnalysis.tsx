import React, { useState, useEffect, useCallback } from 'react';
import { IRTParams } from '../types';
import { getChatResponse } from '../services/geminiService';
import ICCChart from './ICCChart';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface IRTAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, min, max, step, onChange }) => (
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

const IRTAnalysis: React.FC<IRTAnalysisProps> = ({ onBack }) => {
    const [irtParams, setIrtParams] = useState<IRTParams>({
        discrimination: 1.0,
        difficulty: 0.0,
    });

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can explain how item difficulty and discrimination affect student performance. Try moving the sliders to see the curve change!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleParamChange = (param: keyof IRTParams, value: number) => {
        setIrtParams(prev => ({ ...prev, [param]: value }));
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are analyzing Item Response Theory (IRT).
            Item Parameters:
            Discrimination (a) = ${irtParams.discrimination.toFixed(2)}
            Difficulty (b) = ${irtParams.difficulty.toFixed(2)}
            
            User Question: ${msg}
            
            Explain how these parameters shape the Item Characteristic Curve (ICC) and what that means for testing students.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the IRT curve right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [irtParams]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-lime-400 hover:text-lime-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-lime-400">Item Response Theory (IRT)</h1>
                    <p className="text-slate-400 mt-2">Visualize how item characteristics influence the probability of a correct answer.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <ICCChart params={irtParams} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h3 className="text-lg font-semibold text-lime-400 mb-3 border-b border-lime-400/20 pb-2">Item Parameters</h3>
                        <Slider
                            label="Discrimination (a)"
                            value={irtParams.discrimination}
                            min={0.1}
                            max={5.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('discrimination', +e.target.value)}
                        />
                        <Slider
                            label="Difficulty (b)"
                            value={irtParams.difficulty}
                            min={-3.0}
                            max={3.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('difficulty', +e.target.value)}
                        />
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Item Response Theory"
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

export default IRTAnalysis;
