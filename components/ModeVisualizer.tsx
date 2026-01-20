
import React, { useState, useMemo } from 'react';
import { getChatResponse } from '../services/geminiService';
import { logEvent } from '../services/loggingService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface ModeVisualizerProps {
    onBack: () => void;
}

const CATEGORIES = ['🍎', '🍌', '🍇', '🍊', '🍉'];

const ModeVisualizer: React.FC<ModeVisualizerProps> = ({ onBack }) => {
    const [counts, setCounts] = useState<number[]>([1, 3, 2, 5, 2]);
    const [attemptCount, setAttemptCount] = useState(0);
    const [hasAchievedGreen, setHasAchievedGreen] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Welcome to The Mode Magnet! 🧲 I'm Dr. Gem. Stack the blocks to find the Mode (the most popular value)." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const maxCount = Math.max(...counts);
    const modes = counts.map((c, i) => c === maxCount ? i : -1).filter(i => i !== -1);

    // Mode usefulness calculation (ratio-based)
    const modeAnalysis = useMemo(() => {
        const total = counts.reduce((a, b) => a + b, 0);
        if (total === 0) return { isUseful: false, hasMultipleModes: false, message: '', modeRatio: 0 };

        const sortedCounts = [...counts].sort((a, b) => b - a);
        const modeCount = sortedCounts[0];
        const secondCount = sortedCounts[1] || 0;

        const modeRatio = modeCount / total;
        const diffRatio = (modeCount - secondCount) / total;

        // Check for multiple modes (ties)
        const modeCountTies = counts.filter(c => c === modeCount).length;
        const hasMultipleModes = modeCountTies > 1;

        // Mode is useful if: 40%+ AND 15%+ difference from second place
        const isUseful = !hasMultipleModes && modeRatio >= 0.4 && diffRatio >= 0.15;

        let message = '';
        if (hasMultipleModes) {
            message = '⚠️ Multiple modes found. Not suitable as a representative value.';
        } else if (isUseful) {
            message = `✅ Mode is clear! Represents ${(modeRatio * 100).toFixed(0)}% of all data.`;
        } else {
            message = '❌ Distribution is uniform. Mode alone is not informative.';
        }

        return { isUseful, hasMultipleModes, message, modeRatio };
    }, [counts]);

    const handleAdd = (index: number) => {
        const newCounts = [...counts];
        if (newCounts[index] < 10) {
            newCounts[index]++;
            logEvent('add_block', 'ModeVisualizer', { category: CATEGORIES[index], newCount: newCounts[index] });
            setAttemptCount(prev => prev + 1);
        }
        setCounts(newCounts);
    };

    const handleRemove = (index: number) => {
        const newCounts = [...counts];
        if (newCounts[index] > 0) {
            newCounts[index]--;
            logEvent('remove_block', 'ModeVisualizer', { category: CATEGORIES[index], newCount: newCounts[index] });
            setAttemptCount(prev => prev + 1);
        }
        setCounts(newCounts);
    };

    // Track if user achieved green state
    React.useEffect(() => {
        if (modeAnalysis.isUseful && !hasAchievedGreen) {
            setHasAchievedGreen(true);
            logEvent('achieved_useful_mode', 'ModeVisualizer', { attempts: attemptCount });
        }
    }, [modeAnalysis.isUseful, hasAchievedGreen, attemptCount]);

    // Show hint after 5 attempts without achieving green
    React.useEffect(() => {
        if (attemptCount >= 5 && !hasAchievedGreen && !showHint) {
            setShowHint(true);
        }
    }, [attemptCount, hasAchievedGreen, showHint]);

    const getHintMessage = () => {
        const total = counts.reduce((a, b) => a + b, 0);
        const maxNeeded = Math.ceil(total * 0.4);
        return `💡 Hint: To make Mode useful, one category needs to be clearly dominant. Try making one tower reach ${maxNeeded}+ blocks (40% of total ${total}).`;
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const modeNames = modes.map(i => CATEGORIES[i]);
        const context = `
            You are Dr. Gem, explaining the Mode (Statistics).
            Current Data:
            - Fruits: ${CATEGORIES.map((c, i) => `${c}:${counts[i]}`).join(', ')}
            - Mode (Tallest Tower): ${modeNames.join(' and ')}
            - Type: ${modes.length > 1 ? "Multi-modal" : "Uni-modal"}
            - Mode Usefulness: ${modeAnalysis.message}
            - Mode Ratio: ${(modeAnalysis.modeRatio * 100).toFixed(0)}%
            
            Educational Goal: 
            - Use the visual of "tallest stack" to explain Mode.
            - Explain when Mode is useful (one clear dominant value) vs not useful (evenly distributed).
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

    // Background color based on Mode usefulness
    const getUsefulnessStyle = () => {
        if (modeAnalysis.hasMultipleModes) {
            return 'bg-amber-900/30 border-amber-500/50';
        }
        if (modeAnalysis.isUseful) {
            return 'bg-emerald-900/30 border-emerald-500/50';
        }
        return 'bg-rose-900/30 border-rose-500/50';
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
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-8 flex flex-col">
                    {/* Mode Usefulness Indicator */}
                    <div className={`mb-4 p-3 rounded-lg border-2 transition-all duration-300 ${getUsefulnessStyle()}`}>
                        <div className="text-sm font-bold text-slate-200">{modeAnalysis.message}</div>
                    </div>

                    {/* Hint Panel - shows after 5 attempts without green */}
                    {showHint && !modeAnalysis.isUseful && (
                        <div className="mb-4 p-3 rounded-lg border-2 border-blue-500/50 bg-blue-900/30 transition-all duration-300">
                            <div className="text-sm text-blue-200">{getHintMessage()}</div>
                            <button
                                onClick={() => setShowHint(false)}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                Hide hint
                            </button>
                        </div>
                    )}

                    {/* Fruit Stacks */}
                    <div className="flex items-end justify-around flex-1 min-h-[350px]">
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
                                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full font-bold text-amber-400 animate-bounce whitespace-nowrap">MODE</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col space-y-6 overflow-hidden">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
                        <h3 className="text-lg font-semibold text-amber-400 mb-4">Statistics</h3>
                        <div className="text-2xl font-mono text-white mb-4">
                            Mode: <span className="text-amber-400">{modes.map(i => CATEGORIES[i]).join(', ')}</span>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                            {modes.length > 1 ? "This distribution is Multi-modal (has multiple peaks)." : "This distribution is Uni-modal (one clear peak)."}
                        </p>
                        <button onClick={() => handleSendMessage("Explain this mode")} className="w-full bg-amber-600 hover:bg-amber-700 p-2 rounded text-white font-bold mb-4">Why is this the Mode?</button>

                        <div className="flex-1 min-h-0 overflow-hidden">
                            <div className="h-full overflow-y-auto">
                                <UnifiedGenAIChat
                                    moduleTitle="The Mode Magnet"
                                    history={chatHistory}
                                    onSendMessage={handleSendMessage}
                                    isLoading={isChatLoading}
                                    variant="embedded"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ModeVisualizer;
