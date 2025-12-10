import React, { useState, useEffect, useCallback } from 'react';
import { HMMSequenceItem } from '../types';
import { generateHMMSequence } from '../services/statisticsService';
import { getHMMExplanation } from '../services/geminiService';
import GeminiExplanation from './GeminiExplanation';
import HMMSequenceVisualizer from './HMMSequenceVisualizer';

interface HMMAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
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
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const generateNewSequence = useCallback(() => {
        const newSequence = generateHMMSequence(transitionProbs, 15);
        setSequence(newSequence);
    }, [transitionProbs]);
    
    // Generate initial sequence
    useEffect(() => {
        generateNewSequence();
    }, []);

    // Fetch explanation when sequence changes
    useEffect(() => {
        if (sequence.length === 0) return;

        setIsLoading(true);
        const handler = setTimeout(async () => {
            const observations = sequence.map(item => item.observation);
            const exp = await getHMMExplanation(transitionProbs, observations);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [sequence, transitionProbs]);

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
                                        setTransitionProbs(p => ({...p, sunnyToSunny: newVal}));
                                        generateNewSequence();
                                    }} 
                                />
                                <Slider 
                                    label="P(Rainy 🌧️ → Rainy 🌧️)" 
                                    value={transitionProbs.rainyToRainy} 
                                    min={0.05} max={0.99} step={0.01} 
                                    onChange={(e) => {
                                        const newVal = +e.target.value;
                                        setTransitionProbs(p => ({...p, rainyToRainy: newVal}));
                                        generateNewSequence();
                                    }} 
                                />
                            </div>
                        </div>
                        <button onClick={generateNewSequence} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Generate New Sequence
                        </button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    This can model a student's journey through a learning module. The 'hidden states' might be "Confused," "Engaged," and "Mastered." The 'observations' are their actions: re-watching a video, taking a quiz, or moving to the next topic. By observing the action sequence, an intelligent tutoring system can infer the student's hidden cognitive state and decide when to offer help.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HMMAnalysis;