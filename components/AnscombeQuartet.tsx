
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

const DATASET_LABELS: Record<DatasetKey, string> = {
    I: 'Linear',
    II: 'Curved',
    III: 'Outlier-Driven',
    IV: 'Leverage Point'
};

const DATASET_EXPLANATIONS: Record<DatasetKey, { short: string; detail: string; isTarget: boolean }> = {
    I: {
        short: '✅ Normal linear relationship',
        detail: 'This dataset shows a standard linear trend. The regression line and correlation accurately describe the data. What you see matches what the statistics say.',
        isTarget: false
    },
    II: {
        short: '🎯 Curved relationship hidden by linear stats!',
        detail: 'This is actually a quadratic curve (parabola), but the linear statistics (r = 0.816, y = 0.5x + 3) completely miss this. The mean and correlation LIE — the real pattern is non-linear. This is why you must always visualize your data!',
        isTarget: true
    },
    III: {
        short: '⚠️ One outlier inflates the correlation',
        detail: 'Remove the single outlier at (13, 12.74), and the remaining points form a nearly perfect line. That one extreme point pulls the regression line and inflates r. A single outlier can dramatically distort correlation and regression results.',
        isTarget: false
    },
    IV: {
        short: '🚨 A "leverage point" creates a fake relationship',
        detail: 'All points share x = 8 — there is NO real X-Y relationship. But one extreme point (19, 12.50) acts as a "leverage point" that single-handedly creates a correlation of 0.816. Without it, correlation would be undefined. This shows how a single influential observation can fabricate an entire statistical relationship.',
        isTarget: false
    }
};

type DatasetKey = 'I' | 'II' | 'III' | 'IV';

const AnscombeQuartet: React.FC<AnscombeQuartetProps> = ({ onBack }) => {
    // Game State
    const [selectedSet, setSelectedSet] = useState<DatasetKey | null>(null);
    const [guessedSets, setGuessedSets] = useState<DatasetKey[]>([]);
    const [isCorrect, setIsCorrect] = useState(false);

    // Chat State
    const [chatHistory, setChatHistory] = useState<Message[]>([
        {
            text: "Welcome to 'The Data Detective'! 🕵️‍♂️ All 4 suspects are in the lineup. Look carefully — they ALL have identical statistics (same Mean, Correlation, and Regression Line). But one of them is an **IMPOSTER** with a secretly curved shape. Click the one you think is the imposter!",
            role: 'model'
        }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleCardClick = (set: DatasetKey) => {
        if (isCorrect) return; // Game already won

        setSelectedSet(set);

        if (!guessedSets.includes(set)) {
            setGuessedSets(prev => [...prev, set]);
        }

        const explanation = DATASET_EXPLANATIONS[set];

        if (set === 'II') {
            setIsCorrect(true);
            setChatHistory(prev => [...prev,
            { role: 'user', text: `I think Suspect ${set} is the imposter!` },
            { role: 'model', text: `🎉 **CORRECT!** ${explanation.detail}\n\nNow look at the other datasets too — each one has a unique lesson about why visualization matters. Click any card to learn more!` }
            ]);
        } else {
            setChatHistory(prev => [...prev,
            { role: 'user', text: `Is Suspect ${set} the imposter?` },
            { role: 'model', text: `Not the imposter, but great observation! **${DATASET_LABELS[set]}**: ${explanation.detail}\n\nKeep looking for the one with the **curved** shape!` }
            ]);
        }
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            Game: The Data Detective (Anscombe's Quartet).
            All 4 graphs are visible to the user.
            Selected: ${selectedSet || 'none'}
            Guessed so far: ${guessedSets.join(', ') || 'none'}
            Found the imposter: ${isCorrect}
            Target: Quadratic Curve (Dataset II).
            
            Key Concept: All 4 datasets have identical Mean X (9.0), Mean Y (7.5), Correlation (0.816), and Regression Line (y = 0.5x + 3), but completely different shapes.
            - I: Normal linear relationship
            - II: Curve / Parabola (The Imposter)
            - III: Linear with a single outlier (13, 12.74) that inflates correlation
            - IV: All x=8, one leverage point (19, 12.50) creates fake correlation
            
            Lesson: Statistics alone can be deceiving. Always visualize your data.
            If user asks about outliers, explain how a single point can distort correlation and regression.
            
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
    }, [selectedSet, guessedSets, isCorrect]);

    const handleReset = () => {
        setSelectedSet(null);
        setGuessedSets([]);
        setIsCorrect(false);
        setChatHistory([{
            text: "Fresh case! 🕵️‍♂️ All 4 suspects are back in the lineup. Same stats, different shapes. Find the imposter!",
            role: 'model'
        }]);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-2 inline-block transition-colors">&larr; Back to Portal</button>
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">The Data Detective 🕵️‍♂️</h1>
                    <p className="text-slate-400 mt-2 text-lg">Case File: The Anscombe Quartet — Same stats, different stories</p>
                </div>
                {isCorrect && (
                    <button
                        onClick={handleReset}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-full transition-all"
                    >
                        🔄 New Case
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
                            Suspect Profile (All 4 Share These Exact Stats)
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="Mean X" value="9.0" color="text-green-400" />
                            <StatBox label="Mean Y" value="7.50" color="text-green-400" />
                            <StatBox label="Correlation" value="0.816" color="text-yellow-400" />
                            <StatBox label="Regression Line" value="y = 0.5x + 3" color="text-yellow-400" />
                        </div>
                    </div>

                    {/* The Cards — All Visible */}
                    <div className="grid grid-cols-2 gap-6">
                        {(['I', 'II', 'III', 'IV'] as const).map(set => (
                            <DatasetCard
                                key={set}
                                datasetKey={set}
                                data={DATASETS[set]}
                                isSelected={selectedSet === set}
                                isGuessed={guessedSets.includes(set)}
                                isCorrectAnswer={set === 'II'}
                                gameWon={isCorrect}
                                onClick={() => handleCardClick(set)}
                            />
                        ))}
                    </div>

                    {/* Explanation Panel */}
                    {selectedSet && (
                        <div className={`p-5 rounded-2xl border-2 transition-all duration-500 animate-fade-in ${DATASET_EXPLANATIONS[selectedSet].isTarget && isCorrect
                            ? 'bg-emerald-900/20 border-emerald-500/50'
                            : 'bg-slate-800/50 border-slate-700'
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className="text-2xl mt-0.5">
                                    {DATASET_EXPLANATIONS[selectedSet].isTarget && isCorrect ? '🎉' : '🔍'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        Dataset {selectedSet}: {DATASET_LABELS[selectedSet]}
                                    </h3>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {DATASET_EXPLANATIONS[selectedSet].detail}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
            `}</style>
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

interface DatasetCardProps {
    datasetKey: DatasetKey;
    data: { x: number, y: number }[];
    isSelected: boolean;
    isGuessed: boolean;
    isCorrectAnswer: boolean;
    gameWon: boolean;
    onClick: () => void;
}

const DatasetCard: React.FC<DatasetCardProps> = ({ datasetKey, data, isSelected, isGuessed, isCorrectAnswer, gameWon, onClick }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 300;
        const height = 200;
        const margin = { top: 10, right: 10, bottom: 20, left: 30 };

        svg.selectAll('*').remove();

        const x = d3.scaleLinear().domain([0, 20]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 14]).range([height - margin.bottom, margin.top]);

        // Draw Axes
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5))
            .selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10');
        svg.append('g').attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text').attr('fill', '#94a3b8').attr('font-size', '10');

        // Style axis lines
        svg.selectAll('.domain').attr('stroke', 'rgba(100, 116, 139, 0.3)');
        svg.selectAll('.tick line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        // Draw Regression Line (Always the same: y = 0.5x + 3)
        svg.append('line')
            .attr('x1', x(0))
            .attr('y1', y(3))
            .attr('x2', x(20))
            .attr('y2', y(13))
            .attr('stroke', 'rgba(250, 204, 21, 0.4)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        // Determine which points are outliers for highlighting
        const isOutlierPoint = (d: { x: number; y: number }) => {
            if (datasetKey === 'III' && d.x === 13 && d.y === 12.74) return true;
            if (datasetKey === 'IV' && d.x === 19 && d.y === 12.50) return true;
            return false;
        };

        // Draw Points with Animation
        svg.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 0)
            .attr('fill', d => isOutlierPoint(d) ? '#f87171' : '#22d3ee')
            .attr('stroke', d => isOutlierPoint(d) ? '#dc2626' : '#0f172a')
            .attr('stroke-width', d => isOutlierPoint(d) ? 2 : 1)
            .transition().duration(600).delay((_, i) => i * 40)
            .attr('r', d => isOutlierPoint(d) ? 7 : 5);

        // Add outlier labels
        data.forEach(d => {
            if (isOutlierPoint(d)) {
                svg.append('text')
                    .attr('x', x(d.x) + 10)
                    .attr('y', y(d.y) - 8)
                    .attr('fill', '#f87171')
                    .attr('font-size', '9')
                    .attr('font-weight', 'bold')
                    .text('outlier')
                    .attr('opacity', 0)
                    .transition().duration(600).delay(500)
                    .attr('opacity', 1);
            }
        });

    }, [data, datasetKey]);

    // Determine card border color
    let borderClass = 'border-slate-700 hover:border-cyan-400';
    if (isSelected) {
        if (isCorrectAnswer && gameWon) {
            borderClass = 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.2)]';
        } else if (isGuessed && !isCorrectAnswer) {
            borderClass = 'border-orange-500/50';
        } else {
            borderClass = 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]';
        }
    } else if (isGuessed && !isCorrectAnswer) {
        borderClass = 'border-slate-600 opacity-70';
    } else if (gameWon && isCorrectAnswer) {
        borderClass = 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
    }

    return (
        <div
            onClick={onClick}
            className={`
                relative rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer group bg-slate-800
                ${borderClass}
            `}
        >
            {/* Label */}
            <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-1 rounded ${isSelected ? 'bg-cyan-900/80 text-cyan-300' : 'bg-slate-700 text-slate-400'
                    }`}>
                    Suspect {datasetKey}
                </span>
                <span className="text-xs text-slate-500 italic">{DATASET_LABELS[datasetKey]}</span>
                {gameWon && isCorrectAnswer && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded font-bold">IMPOSTER!</span>
                )}
                {isGuessed && !isCorrectAnswer && (
                    <span className="text-xs bg-slate-700 text-slate-500 px-2 py-0.5 rounded">cleared</span>
                )}
            </div>

            {/* Short explanation tag */}
            {isGuessed && (
                <div className="absolute bottom-2 left-3 right-3 z-10">
                    <span className={`text-xs px-2 py-1 rounded ${isCorrectAnswer ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-900/80 text-slate-400'
                        }`}>
                        {DATASET_EXPLANATIONS[datasetKey].short}
                    </span>
                </div>
            )}

            {/* Graph — Always Visible */}
            <div className="pt-2">
                <svg ref={svgRef} className="w-full h-52" viewBox="0 0 300 200"></svg>
            </div>
        </div>
    );
};

export default AnscombeQuartet;

