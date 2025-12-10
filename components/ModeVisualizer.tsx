
import React, { useState } from 'react';
import { getChatResponse } from '../services/geminiService';
import GeminiExplanation from './GeminiExplanation';

interface ModeVisualizerProps {
    onBack: () => void;
}

const CATEGORIES = ['🍎', '🍌', '🍇', '🍊', '🍉'];

const ModeVisualizer: React.FC<ModeVisualizerProps> = ({ onBack }) => {
    const [counts, setCounts] = useState<number[]>([1, 3, 2, 5, 2]);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const maxCount = Math.max(...counts);
    const modes = counts.map((c, i) => c === maxCount ? i : -1).filter(i => i !== -1);
    
    const handleAdd = (index: number) => {
        const newCounts = [...counts];
        if (newCounts[index] < 10) newCounts[index]++;
        setCounts(newCounts);
    };

    const handleRemove = (index: number) => {
        const newCounts = [...counts];
        if (newCounts[index] > 0) newCounts[index]--;
        setCounts(newCounts);
    };

    const handleAsk = async () => {
        setIsLoading(true);
        const modeNames = modes.map(i => CATEGORIES[i]);
        const prompt = `I have a dataset of fruits: ${CATEGORIES.map((c,i) => `${c}:${counts[i]}`).join(', ')}. 
        The Mode is ${modeNames.join(' and ')}. 
        Explain what the Mode tells us about this fruit basket in one simple sentence.`;
        
        const response = await getChatResponse(prompt, "You are a statistics tutor.");
        setExplanation(response);
        setIsLoading(false);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">The Mode Magnet</h1>
                    <p className="text-slate-400 mt-2">The Mode is the value that appears most frequently (the tallest tower).</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-8 flex items-end justify-around min-h-[400px]">
                    {counts.map((count, i) => {
                        const isMode = count === maxCount;
                        return (
                            <div key={i} className="flex flex-col items-center group relative h-full justify-end w-full mx-2">
                                <div className="mb-2 space-y-1 w-full flex flex-col-reverse items-center">
                                    {Array.from({ length: count }).map((_, blockIndex) => (
                                        <div 
                                            key={blockIndex} 
                                            className={`w-full max-w-[60px] h-8 rounded border border-black/20 shadow-sm transition-all duration-300 ${isMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                                        ></div>
                                    ))}
                                </div>
                                <div className="text-4xl mb-2 cursor-pointer hover:scale-110 transition-transform" onClick={() => handleAdd(i)}>{CATEGORIES[i]}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRemove(i)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white">-</button>
                                    <button onClick={() => handleAdd(i)} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white">+</button>
                                </div>
                                {isMode && (
                                    <div className="absolute -top-10 font-bold text-amber-400 animate-bounce">MODE</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="lg:col-span-1 flex flex-col space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-amber-400 mb-4">Statistics</h3>
                        <div className="text-2xl font-mono text-white mb-4">
                            Mode: <span className="text-amber-400">{modes.map(i => CATEGORIES[i]).join(', ')}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            {modes.length > 1 ? "This distribution is Multi-modal (has multiple peaks)." : "This distribution is Uni-modal (one clear peak)."}
                        </p>
                        <button onClick={handleAsk} className="w-full bg-amber-600 hover:bg-amber-700 p-2 rounded text-white font-bold">Ask Dr. Gem</button>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                </div>
            </main>
        </div>
    );
};

export default ModeVisualizer;
