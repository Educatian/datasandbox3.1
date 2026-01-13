
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface AnscombeQuartetProps {
    onBack: () => void;
}

const DATASETS = {
    I: [
        { x: 10, y: 8.04 }, { x: 8, y: 6.95 }, { x: 13, y: 7.58 }, { x: 9, y: 8.81 },
        { x: 11, y: 8.33 }, { x: 14, y: 9.96 }, { x: 6, y: 7.24 }, { x: 4, y: 4.26 },
        { x: 12, y: 10.84 }, { x: 7, y: 4.82 }, { x: 5, y: 5.68 }
    ],
    II: [
        { x: 10, y: 9.14 }, { x: 8, y: 8.14 }, { x: 13, y: 8.74 }, { x: 9, y: 8.77 },
        { x: 11, y: 9.26 }, { x: 14, y: 8.10 }, { x: 6, y: 6.13 }, { x: 4, y: 3.10 },
        { x: 12, y: 9.13 }, { x: 7, y: 7.26 }, { x: 5, y: 4.74 }
    ],
    III: [
        { x: 10, y: 7.46 }, { x: 8, y: 6.77 }, { x: 13, y: 12.74 }, { x: 9, y: 7.11 },
        { x: 11, y: 7.81 }, { x: 14, y: 8.84 }, { x: 6, y: 6.08 }, { x: 4, y: 5.39 },
        { x: 12, y: 8.15 }, { x: 7, y: 6.42 }, { x: 5, y: 5.73 }
    ],
    IV: [
        { x: 8, y: 6.58 }, { x: 8, y: 5.76 }, { x: 8, y: 7.71 }, { x: 8, y: 8.84 },
        { x: 8, y: 8.47 }, { x: 8, y: 7.04 }, { x: 8, y: 5.25 }, { x: 19, y: 12.50 },
        { x: 8, y: 5.56 }, { x: 8, y: 7.91 }, { x: 8, y: 6.89 }
    ]
};

type DatasetKey = 'I' | 'II' | 'III' | 'IV';

const AnscombeQuartet: React.FC<AnscombeQuartetProps> = ({ onBack }) => {
    // Game State
    const [gameState, setGameState] = useState<'intro' | 'guessing' | 'revealed'>('intro');
    const [revealedSets, setRevealedSets] = useState<DatasetKey[]>([]);

    // Chat State
    const [chatHistory, setChatHistory] = useState<Message[]>([
        {
            text: "Welcome to 'The Data Detective'! 🕵️‍♂️ I have 4 suspects (datasets). Look at the 'Suspect Profile' below. They ALL match these stats exactly. But one of them is an IMPOSTER with a completely different shape. Can you help me find them?",
            role: 'model'
        }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleStartGame = () => {
        setGameState('guessing');
        setChatHistory(prev => [...prev,
        { role: 'user', text: "I'm ready to investigate." },
        { role: 'model', text: "Excellent. I'm looking for the suspect that forms a **Quadratic Curve** (a parabola). The stats say it's a straight line, but my eyes tell me otherwise. Click a card to reveal the graph!" }
        ]);
    };

    const handleCardClick = (set: DatasetKey) => {
        if (revealedSets.includes(set)) return;

        setRevealedSets(prev => [...prev, set]);

        // Game Logic for "Curve" target (Dataset II)
        if (set === 'II') {
            setGameState('revealed');
            setChatHistory(prev => [...prev,
            { role: 'user', text: `I think it's Suspect ${set}!` },
            { role: 'model', text: "BINGO! 🎉 Look at that beautiful curve. The stats lied—the Mean and Regression Line said 'Straight', but the data says 'Curved'. This is exactly why we visualize data!" }
            ]);
        } else {
            setChatHistory(prev => [...prev,
            { role: 'user', text: `Is it Suspect ${set}?` },
            { role: 'model', text: "Not quite! This one looks linear (or just messy). Keep looking for the smooth Curve!" }
            ]);
        }
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            Game: The Data Detective (Anscombe's Quartet).
            Current State: ${gameState}
            Revealed Sets: ${revealedSets.join(', ')}
            Target: Quadratic Curve (Dataset II).
            
            Key Concept: All 4 datasets have identical Mean X (9.0), Mean Y (7.5), Correlation (0.816), and Regression Line, but completely different shapes.
            - I: Normal linear
            - II: Curve (The Target)
            - III: Linear with outlier
            - IV: Vertical with outlier
            
            User says: ${msg}
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the evidence.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [gameState, revealedSets]);

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-2 inline-block transition-colors">&larr; Back to Portal</button>
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">The Data Detective 🕵️‍♂️</h1>
                    <p className="text-slate-400 mt-2 text-lg">Case File: The Anscombe Quartet</p>
                </div>
                {gameState === 'intro' && (
                    <button
                        onClick={handleStartGame}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all text-xl animate-pulse"
                    >
                        Start Investigation
                    </button>
                )}
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: The Lineup */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Suspect Profile (Stats) */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-slate-300 mb-4 flex items-center">
                            <span className="bg-slate-700 p-2 rounded mr-3">📄</span>
                            Suspect Profile (Shared Stats)
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="Mean X" value="9.0" color="text-green-400" />
                            <StatBox label="Mean Y" value="7.50" color="text-green-400" />
                            <StatBox label="Correlation" value="0.816" color="text-yellow-400" />
                            <StatBox label="Regression Line" value="y = 0.5x + 3" color="text-yellow-400" />
                        </div>
                    </div>

                    {/* The Cards */}
                    <div className="grid grid-cols-2 gap-6">
                        {(['I', 'II', 'III', 'IV'] as const).map(set => (
                            <MysteryCard
                                key={set}
                                datasetKey={set}
                                data={DATASETS[set]}
                                isRevealed={revealedSets.includes(set)}
                                onClick={() => handleCardClick(set)}
                                isInteractable={gameState === 'guessing'}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Panel: Detective Console */}
                <div className="lg:col-span-4 flex flex-col h-[600px] lg:h-auto lg:min-h-[600px]">
                    <div className="flex-grow bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-slate-800 p-4 border-b border-slate-700">
                            <h3 className="font-bold text-cyan-400">Dr. Gem (Forensics Lab)</h3>
                        </div>
                        <UnifiedGenAIChat
                            moduleTitle="The Data Detective"
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

// Sub-components

const StatBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/50 text-center">
        <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    </div>
);

const MysteryCard = ({ datasetKey, data, isRevealed, onClick, isInteractable }: {
    datasetKey: DatasetKey,
    data: { x: number, y: number }[],
    isRevealed: boolean,
    onClick: () => void,
    isInteractable: boolean
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !isRevealed) return;

        const svg = d3.select(svgRef.current);
        const width = 300;
        const height = 200;
        const margin = { top: 10, right: 10, bottom: 20, left: 30 };

        svg.selectAll('*').remove();

        const x = d3.scaleLinear().domain([0, 20]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 14]).range([height - margin.bottom, margin.top]);

        // Draw Axes
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5));
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));

        // Draw Regression Line (Always the same)
        svg.append('line')
            .attr('x1', x(0))
            .attr('y1', y(3))
            .attr('x2', x(20))
            .attr('y2', y(13)) // y = 0.5(20) + 3 = 13
            .attr('stroke', 'rgba(250, 204, 21, 0.5)') // Yellow-400
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        // Draw Points with Animation
        svg.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 0)
            .attr('fill', '#22d3ee') // Cyan-400
            .attr('stroke', '#0f172a')
            .transition().duration(800).delay((d, i) => i * 50)
            .attr('r', 5);

    }, [isRevealed, data]);

    return (
        <div
            onClick={isInteractable ? onClick : undefined}
            className={`
                relative h-64 rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer group
                ${isRevealed
                    ? 'bg-slate-800 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                    : isInteractable
                        ? 'bg-slate-800 border-slate-700 hover:border-cyan-400 hover:shadow-xl hover:-translate-y-1'
                        : 'bg-slate-800/50 border-slate-700 opacity-75 cursor-not-allowed'}
            `}
        >
            {/* Label */}
            <div className="absolute top-3 left-4 z-10">
                <span className={`text-sm font-bold px-2 py-1 rounded ${isRevealed ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-700 text-slate-400'}`}>
                    Suspect {datasetKey}
                </span>
            </div>

            {/* Content */}
            {isRevealed ? (
                <svg ref={svgRef} className="w-full h-full" viewBox="0 0 300 200"></svg>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500">❓</div>
                    {isInteractable && (
                        <div className="absolute bottom-4 text-cyan-400 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to Reveal
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnscombeQuartet;

