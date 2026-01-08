import React, { useState, useEffect, useCallback } from 'react';
import { HMMSequenceItem } from '../types';
import { generateHMMSequence } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import HMMSequenceVisualizer from './HMMSequenceVisualizer';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface HMMAnalysisProps {
    onBack: () => void;
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

const HMMAnalysis: React.FC<HMMAnalysisProps> = ({ onBack }) => {
    const [transitionProbs, setTransitionProbs] = useState({ sunnyToSunny: 0.9, rainyToRainy: 0.6 });
    const [sequence, setSequence] = useState<HMMSequenceItem[]>([]);

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you understand how hidden states (like weather) cause the observations you see (like activities). Adjust the probabilities to see what happens!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const generateNewSequence = useCallback(() => {
        const newSequence = generateHMMSequence(transitionProbs, 15);
        setSequence(newSequence);
    }, [transitionProbs]);

    // Generate initial sequence
    useEffect(() => {
        generateNewSequence();
    }, []);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are analyzing a Hidden Markov Model (HMM).
            Transition Probabilities:
            P(Sunny|Sunny) = ${transitionProbs.sunnyToSunny}
            P(Rainy|Rainy) = ${transitionProbs.rainyToRainy}
            sequence length: ${sequence.length}
            
            User Question: ${msg}
            
            Explain how the transition probabilities affect the stability of the weather states and the resulting observations.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the HMM sequence.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [transitionProbs, sequence]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-orange-400 hover:text-orange-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-orange-400">Hidden Markov Model (HMM)</h1>
                    <p className="text-slate-400 mt-2">Adjust weather probabilities to see how they influence daily activities.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-[250px]">
                    <HMMSequenceVisualizer sequence={sequence} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-orange-400 mb-3 border-b border-orange-400/20 pb-2">Transition Probabilities</h3>
                            <p className="text-xs text-slate-400 mb-3">How likely is the weather to stay the same from one day to the next?</p>
                            <div className="space-y-4 mt-3">
                                <Slider
                                    label="P(Sunny ☀️ → Sunny ☀️)"
                                    value={transitionProbs.sunnyToSunny}
                                    min={0.05} max={0.99} step={0.01}
                                    onChange={(e) => {
                                        const newVal = +e.target.value;
                                        setTransitionProbs(p => ({ ...p, sunnyToSunny: newVal }));
                                        generateNewSequence();
                                    }}
                                />
                                <Slider
                                    label="P(Rainy 🌧️ → Rainy 🌧️)"
                                    value={transitionProbs.rainyToRainy}
                                    min={0.05} max={0.99} step={0.01}
                                    onChange={(e) => {
                                        const newVal = +e.target.value;
                                        setTransitionProbs(p => ({ ...p, rainyToRainy: newVal }));
                                        generateNewSequence();
                                    }}
                                />
                            </div>
                        </div>
                        <button onClick={generateNewSequence} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Generate New Sequence
                        </button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Hidden Markov Model"
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

export default HMMAnalysis;