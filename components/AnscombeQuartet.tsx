
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

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

const AnscombeQuartet: React.FC<AnscombeQuartetProps> = ({ onBack }) => {
    const [selectedSet, setSelectedSet] = useState<'I' | 'II' | 'III' | 'IV'>('I');
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can explain the importance of visualizing data. Check out these datasets—they all have the same stats but look totally different!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = 600;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const data = DATASETS[selectedSet];

        const x = d3.scaleLinear().domain([0, 20]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 14]).range([height - margin.bottom, margin.top]);

        // Grid
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', '#64748b');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', '#64748b');

        // Regression Line (Matches all datasets approx y = 0.5x + 3)
        // Calculating actual regression for visualization
        const meanX = d3.mean(data, d => d.x) || 0;
        const meanY = d3.mean(data, d => d.y) || 0;
        const num = d3.sum(data, d => (d.x - meanX) * (d.y - meanY));
        const den = d3.sum(data, d => Math.pow(d.x - meanX, 2));
        const slope = num / den;
        const intercept = meanY - slope * meanX;

        svg.append('line')
            .attr('x1', x(0))
            .attr('y1', y(intercept))
            .attr('x2', x(20))
            .attr('y2', y(slope * 20 + intercept))
            .attr('stroke', '#facc15')
            .attr('stroke-width', 2);

        // Points
        svg.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 6)
            .attr('fill', '#38bdf8')
            .attr('stroke', '#0f172a');

    }, [selectedSet]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are looking at Anscombe's Quartet.
            Currently viewing: Dataset ${selectedSet}.
            
            Key Fact: All four datasets (I, II, III, IV) have nearly identical simple descriptive statistics (mean, variance, correlation, linear regression line), yet appear very different when graphed.
            dataset I: Linear trend.
            dataset II: Non-linear (quadratic) trend.
            dataset III: Linear with one outlier.
            dataset IV: Vertical line with one outlier that skewers the regression.
            
            User Question: ${msg}
            
            Explain why visualization is critical before relying on summary statistics.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing this dataset.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedSet]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">The Anscombe Quartet</h1>
                    <p className="text-slate-400 mt-2">Four datasets with identical stats, but very different stories.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4">
                    <svg ref={svgRef} className="w-full h-full min-h-[400px]"></svg>
                </div>

                <div className="lg:col-span-1 flex flex-col space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {(['I', 'II', 'III', 'IV'] as const).map(set => (
                                <button
                                    key={set}
                                    onClick={() => setSelectedSet(set)}
                                    className={`py-2 px-4 rounded font-bold transition-all ${selectedSet === set ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                                >
                                    Dataset {set}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2 font-mono text-sm border-t border-slate-700 pt-4">
                            <div className="text-slate-400 text-xs uppercase mb-2">Identical Stats for ALL Sets:</div>
                            <div className="flex justify-between"><span className="text-slate-300">Mean X:</span> <span className="text-green-400">9.0</span></div>
                            <div className="flex justify-between"><span className="text-slate-300">Mean Y:</span> <span className="text-green-400">7.50</span></div>
                            <div className="flex justify-between"><span className="text-slate-300">Correlation:</span> <span className="text-green-400">0.816</span></div>
                            <div className="flex justify-between"><span className="text-slate-300">Line:</span> <span className="text-yellow-400">y = 0.5x + 3.0</span></div>
                        </div>
                    </div>

                    <div className="h-[400px]">
                        <UnifiedGenAIChat
                            moduleTitle="Anscombe's Quartet"
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

export default AnscombeQuartet;
