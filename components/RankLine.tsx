
import React, { useState, useEffect, useMemo } from 'react';
import { getChatResponse } from '../services/geminiService';
import AITutor, { ChatMessage } from './AITutor';

interface RankLineProps {
    onBack: () => void;
}

// Generate 100 scores following a normal distribution
const generateScores = () => {
    const scores = [];
    for (let i = 0; i < 100; i++) {
        // Box-Muller transform for simple normal distribution approximation
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        // Mean 75, SD 15, clamped 0-100
        let score = 75 + z * 15;
        score = Math.max(0, Math.min(100, score));
        scores.push(score);
    }
    return scores.sort((a, b) => a - b);
};

const RankLine: React.FC<RankLineProps> = ({ onBack }) => {
    const [percentile, setPercentile] = useState(50);
    const [scores] = useState<number[]>(generateScores);
    
    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Welcome to The Rank Line! 🚩 I'm Dr. Gem.", sender: 'bot' },
        { text: "This lineup represents 100 students sorted by score. Move the slider to understand Percentiles.", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const currentScore = scores[Math.max(0, percentile - 1)];

    const getQuartileLabel = (p: number) => {
        if (p < 25) return "1st Quartile (Bottom 25%)";
        if (p < 50) return "2nd Quartile";
        if (p < 75) return "3rd Quartile";
        return "4th Quartile (Top 25%)";
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining Percentiles and Quartiles using a visual lineup of 100 students.
            Current State:
            - User selected Percentile: ${percentile}th
            - Score at this percentile: ${currentScore?.toFixed(1)}
            - Quartile Range: ${getQuartileLabel(percentile)}
            
            Educational Concepts:
            - Percentile: The percentage of data falls *below* a specific value.
            - Q1=25th, Median=50th, Q3=75th.
            - Difference between "Percent Correct" (absolute) and "Percentile" (relative).
            
            Keep explanations brief and interactive.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "Connection error. Please try again.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const jumpTo = (val: number, label: string) => {
        setPercentile(val);
        setChatHistory(prev => [...prev, { text: `Jumped to ${label} (${val}th percentile).`, sender: 'user' }]);
        setTimeout(() => {
             // Trigger a simple bot reaction based on the jump
             let reaction = "";
             if (val === 50) reaction = "Right in the middle! That's the Median.";
             else if (val === 25) reaction = "That's Q1. 25% scored lower, 75% scored higher.";
             else if (val === 75) reaction = "That's Q3. Only the top 25% are above this point.";
             else if (val === 99) reaction = "Top of the class!";
             
             if(reaction) setChatHistory(prev => [...prev, { text: reaction, sender: 'bot' }]);
        }, 500);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-emerald-400">The Rank Line</h1>
                    <p className="text-slate-400 mt-2">Visualizing Percentiles, Quartiles, and Relative Standing.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Visualization */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    
                    {/* The Lineup Container */}
                    <div className="bg-slate-900 rounded-xl p-6 border-4 border-slate-800 shadow-2xl relative min-h-[400px]">
                        
                        {/* Metrics Overlay */}
                        <div className="flex justify-between items-end mb-6 border-b border-slate-700 pb-4">
                            <div>
                                <div className="text-slate-400 text-sm uppercase tracking-widest">Percentile Rank</div>
                                <div className="text-5xl font-black text-emerald-400">{percentile}<span className="text-2xl align-top">th</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-400 text-sm uppercase tracking-widest">Test Score</div>
                                <div className="text-3xl font-mono text-white">{currentScore?.toFixed(0)} / 100</div>
                            </div>
                        </div>

                        {/* The People Grid */}
                        <div className="grid grid-cols-10 gap-2 mb-8">
                            {scores.map((score, index) => {
                                const rank = index + 1;
                                const isBelow = rank <= percentile;
                                const isExact = rank === percentile;
                                
                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            relative h-8 rounded transition-all duration-300 flex items-center justify-center group
                                            ${isExact ? 'bg-white scale-125 z-10 shadow-[0_0_15px_white]' : ''}
                                            ${!isExact && isBelow ? 'bg-emerald-600/80' : ''}
                                            ${!isExact && !isBelow ? 'bg-slate-700/50' : ''}
                                        `}
                                        title={`Rank: ${rank}, Score: ${score.toFixed(0)}`}
                                    >
                                        {/* Little Person Icon / Bar */}
                                        <div className={`w-1.5 h-1.5 rounded-full ${isExact ? 'bg-emerald-900' : 'bg-black/20'}`}></div>
                                        
                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs p-1 rounded whitespace-nowrap z-20">
                                            Rank {rank}: {score.toFixed(0)}pts
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Interpretation Text */}
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg text-center">
                            <p className="text-emerald-100 text-lg">
                                You scored higher than <span className="font-bold text-white">{percentile}%</span> of the people.
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                                You are in the <span className="font-bold text-white">{getQuartileLabel(percentile)}</span>.
                            </p>
                        </div>

                        {/* Slider Control */}
                        <div className="mt-8 relative pt-6">
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                value={percentile} 
                                onChange={(e) => setPercentile(parseInt(e.target.value))} 
                                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 z-10 relative"
                            />
                            {/* Tick Marks for Quartiles */}
                            <div className="absolute top-0 left-[25%] w-0.5 h-full bg-slate-600/50 pointer-events-none"><span className="absolute -top-5 -translate-x-1/2 text-xs text-slate-500">Q1</span></div>
                            <div className="absolute top-0 left-[50%] w-0.5 h-full bg-slate-600/50 pointer-events-none"><span className="absolute -top-5 -translate-x-1/2 text-xs text-slate-500">Median</span></div>
                            <div className="absolute top-0 left-[75%] w-0.5 h-full bg-slate-600/50 pointer-events-none"><span className="absolute -top-5 -translate-x-1/2 text-xs text-slate-500">Q3</span></div>
                        </div>

                    </div>
                </div>

                {/* Right: AI Tutor & Controls */}
                <div className="lg:col-span-1 flex flex-col space-y-4">
                    
                    {/* Quick Jump Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => jumpTo(25, "Q1")} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg border border-slate-700 text-sm font-bold text-slate-300 transition-colors">
                            Jump to Q1 (25th)
                        </button>
                        <button onClick={() => jumpTo(50, "Median")} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg border border-slate-700 text-sm font-bold text-slate-300 transition-colors">
                            Jump to Median (50th)
                        </button>
                        <button onClick={() => jumpTo(75, "Q3")} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg border border-slate-700 text-sm font-bold text-slate-300 transition-colors">
                            Jump to Q3 (75th)
                        </button>
                        <button onClick={() => jumpTo(99, "Top")} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg border border-slate-700 text-sm font-bold text-slate-300 transition-colors">
                            Jump to Top (99th)
                        </button>
                    </div>

                    {/* Chatbot */}
                    <div className="flex-grow min-h-[400px]">
                        <AITutor 
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            className="h-full"
                            suggestedActions={[
                                { label: "What is a Quartile?", action: () => handleSendMessage("What is a Quartile?") },
                                { label: "Percentile vs % Correct", action: () => handleSendMessage("Difference between percentile and percent correct?") },
                            ]}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RankLine;
