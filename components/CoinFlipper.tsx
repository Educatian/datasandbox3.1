import React, { useState, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface CoinFlipperProps {
    onBack: () => void;
}

const CoinFlipper: React.FC<CoinFlipperProps> = ({ onBack }) => {
    // Game State
    const [trueBias, setTrueBias] = useState(0.5); // 0.5 = Fair
    const [flips, setFlips] = useState<'H' | 'T'[]>([]);
    const [headsCount, setHeadsCount] = useState(0);
    const [tailsCount, setTailsCount] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);
    const [pValue, setPValue] = useState<number | null>(null);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to The Coin Flipper! 🪙 I'm Dr. Gem.", role: 'model' },
        { text: "Here we test the Null Hypothesis ($H_0$): 'This coin is fair'.", role: 'model' },
        { text: "Flip the coin and see if the results look suspicious!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleFlip = (count: number) => {
        setIsFlipping(true);
        let newHeads = 0;
        let newTails = 0;
        const newResults: ('H' | 'T')[] = [];

        // Simulate flips
        for (let i = 0; i < count; i++) {
            if (Math.random() < trueBias) {
                newHeads++;
                newResults.push('H');
            } else {
                newTails++;
                newResults.push('T');
            }
        }

        setTimeout(() => {
            setHeadsCount(prev => prev + newHeads);
            setTailsCount(prev => prev + newTails);
            setIsFlipping(false);
            calculatePValue(headsCount + newHeads, tailsCount + newTails + headsCount + newHeads);
        }, 500);
    };

    const reset = () => {
        setHeadsCount(0);
        setTailsCount(0);
        setPValue(null);
    };

    // Simple two-tailed binomial p-value approximation for fairness (p=0.5)
    // Calculating probability of observing outcome strictly more extreme
    const calculatePValue = (k: number, n: number) => {
        if (n === 0) return;

        // Z-score approximation for speed (good enough for visualization > 10 flips)
        // Mean = n * 0.5, SD = sqrt(n * 0.5 * 0.5)
        const mean = n * 0.5;
        const sd = Math.sqrt(n * 0.25);
        const z = (k - mean) / sd;

        // P-value from Z (two-tailed)
        // Using a simple approx function from existing services would be ideal, but implementing inline for independence
        const p = 2 * (1 - normalCDF(Math.abs(z)));
        setPValue(p);

        if (p < 0.05) {
            addBotMessage(`Warning! P-value is ${p.toFixed(4)}. This result is very unlikely for a fair coin. We reject the Null Hypothesis!`);
        } else {
            // addBotMessage(`P-value is ${p.toFixed(2)}. This result is typical for a fair coin. We stick with the Null Hypothesis.`);
        }
    };

    function normalCDF(x: number) {
        var t = 1 / (1 + .2316419 * Math.abs(x));
        var d = .3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) prob = 1 - prob;
        return prob;
    }

    const addBotMessage = (text: string) => {
        setChatHistory(prev => [...prev, { text, role: 'model' }]);
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, helping a student with Hypothesis Testing.
            Current Experiment:
            - True Coin Bias (Hidden to student unless they look at slider): ${trueBias}
            - Observed Data: ${headsCount} Heads, ${tailsCount} Tails.
            - Total Flips: ${headsCount + tailsCount}
            - Calculated P-Value: ${pValue?.toFixed(4) || 'N/A'}
            
            Educational Concepts:
            - Null Hypothesis (H0): The coin is fair (bias = 0.5).
            - P-Value: Probability of seeing this data IF H0 is true.
            - Low P-Value (< 0.05): Evidence against H0.
            
            Persona: Suspicious detective investigating a coin.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' as const }]);
        } catch {
            setChatHistory(prev => [...prev, { text: "Connection error.", role: 'model' as const }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-pink-400 hover:text-pink-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-pink-400">The Coin Flipper</h1>
                    <p className="text-slate-400 mt-2">Test your Hypothesis: Is this coin fair?</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Experiment */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    <div className="bg-slate-900 rounded-xl p-8 border-4 border-slate-800 shadow-2xl relative flex flex-col items-center min-h-[400px]">

                        {/* Coin Animation Area */}
                        <div className="relative w-40 h-40 mb-8 perspective-1000">
                            <div className={`w-full h-full rounded-full border-8 border-yellow-500 bg-yellow-400 shadow-[0_0_50px_rgba(234,179,8,0.4)] flex items-center justify-center text-6xl font-black text-yellow-700 transition-transform duration-500 ${isFlipping ? 'animate-[spin_0.5s_linear_infinite]' : ''}`}>
                                {isFlipping ? '?' : (headsCount > tailsCount ? 'H' : 'T')}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-8 w-full max-w-md mb-8">
                            <div className="bg-slate-800 p-4 rounded-lg text-center border-b-4 border-cyan-500">
                                <div className="text-slate-400 text-sm uppercase tracking-widest">Heads</div>
                                <div className="text-4xl font-mono text-white">{headsCount}</div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg text-center border-b-4 border-rose-500">
                                <div className="text-slate-400 text-sm uppercase tracking-widest">Tails</div>
                                <div className="text-4xl font-mono text-white">{tailsCount}</div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-4 mb-8">
                            <button onClick={() => handleFlip(1)} disabled={isFlipping} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all disabled:opacity-50">Flip 1x</button>
                            <button onClick={() => handleFlip(10)} disabled={isFlipping} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-all disabled:opacity-50">Flip 10x</button>
                            <button onClick={reset} className="px-6 py-3 bg-red-900/50 hover:bg-red-900/80 text-red-300 rounded-lg font-bold transition-all">Reset</button>
                        </div>

                        {/* P-Value Meter */}
                        {pValue !== null && (
                            <div className="w-full bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-green-400">Likely Fair (High p)</span>
                                    <span className="text-red-400">Likely Biased (Low p)</span>
                                </div>
                                <div className="h-4 bg-slate-700 rounded-full overflow-hidden relative">
                                    <div className="absolute top-0 bottom-0 left-0 w-[5%] bg-red-500/50 z-10" title="Significance Threshold (0.05)"></div>
                                    <div
                                        className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ${pValue < 0.05 ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${Math.min(100, pValue * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="text-center mt-2 font-mono">
                                    p-value = <span className={pValue < 0.05 ? 'text-red-400 font-bold' : 'text-green-400'}>{pValue.toFixed(4)}</span>
                                </div>
                                <p className="text-center text-xs text-slate-500 mt-1">
                                    {pValue < 0.05 ? "Result is statistically significant! Reject H0." : "Result is not significant. Retain H0."}
                                </p>
                            </div>
                        )}

                        {/* God Mode Control (Bottom) */}
                        <div className="mt-8 pt-6 border-t border-slate-700 w-full">
                            <label className="flex justify-between text-sm text-slate-500 mb-2">
                                <span>GOD MODE: True Coin Bias (Hidden Parameter)</span>
                                <span>{trueBias === 0.5 ? 'Fair (50%)' : `${(trueBias * 100).toFixed(0)}% Heads`}</span>
                            </label>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={trueBias}
                                onChange={(e) => {
                                    setTrueBias(parseFloat(e.target.value));
                                    reset();
                                }}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                        </div>

                    </div>
                </div>

                {/* Right: Chatbot */}
                <div className="lg:col-span-1 h-[600px]">
                    <UnifiedGenAIChat
                        moduleTitle="The Coin Flipper"
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

export default CoinFlipper;
