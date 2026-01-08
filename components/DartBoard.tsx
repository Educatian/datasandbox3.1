import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { generateSampleData } from '../services/statisticsService';

interface DartBoardProps {
    onBack: () => void;
}

interface Shot {
    id: number;
    x: number;
    y: number;
}

const DartBoard: React.FC<DartBoardProps> = ({ onBack }) => {
    const [stdDev, setStdDev] = useState(10);
    const [shots, setShots] = useState<Shot[]>([]);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to The Dart Board! 🎯 I'm Dr. Gem. Adjust the slider to see how Standard Deviation changes the spread of your shots.", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    // Initial Shots
    useEffect(() => {
        handleShoot();
    }, []);

    // Generate new shots when SD changes drastically or on demand
    const handleShoot = () => {
        const count = 50;
        // Generate X and Y normally distributed around center (0,0 visual offset)
        // using our service helper which returns 1D array. We call it twice.
        const xs = generateSampleData(0, stdDev, count);
        const ys = generateSampleData(0, stdDev, count);

        const newShots = xs.map((x, i) => ({
            id: Date.now() + i,
            x: x,
            y: ys[i]
        }));

        setShots(newShots);
    };

    // Render D3
    useEffect(() => {
        if (!svgRef.current) return;

        const width = 500;
        const height = 500;
        const center = width / 2;
        const svg = d3.select(svgRef.current);

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // --- The Board (Static) ---
        const boardGroup = svg.append('g').attr('transform', `translate(${center}, ${center})`);

        // Rings
        const rings = [140, 100, 60, 20]; // Arbitrary visual rings
        const colors = ['#fecaca', '#fde047', '#86efac', '#ef4444']; // Red-100, Yellow-300, Green-300, Red-500

        boardGroup.selectAll('circle.board-ring')
            .data(rings)
            .join('circle')
            .attr('class', 'board-ring')
            .attr('r', d => d)
            .attr('fill', (d, i) => i % 2 === 0 ? 'white' : 'black')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1)
            .attr('opacity', 0.1); // Faint background guide

        // Crosshairs
        boardGroup.append('line').attr('x1', -center).attr('x2', center).attr('y1', 0).attr('y2', 0).attr('stroke', '#475569').attr('stroke-dasharray', '4,4');
        boardGroup.append('line').attr('y1', -center).attr('y2', center).attr('x1', 0).attr('x2', 0).attr('stroke', '#475569').attr('stroke-dasharray', '4,4');

        // --- The SD Visualizers (Dynamic Rings) ---
        // 1 SD Ring (68% of shots should be inside)
        // Note: In 2D, it's actually 39% for 1 sigma radius, but conceptually we show the radius.
        // We scale the visual SD to match the board pixels. Let's say 1 data unit = 3 pixels.
        const scale = 4;

        boardGroup.append('circle')
            .attr('r', stdDev * scale)
            .attr('fill', 'none')
            .attr('stroke', '#3b82f6') // Blue
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        boardGroup.append('text')
            .attr('x', stdDev * scale)
            .attr('y', -stdDev * scale)
            .attr('fill', '#3b82f6')
            .attr('font-size', '12px')
            .text('1 SD');

        boardGroup.append('circle')
            .attr('r', stdDev * 2 * scale)
            .attr('fill', 'none')
            .attr('stroke', '#6366f1') // Indigo
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,2');

        // --- The Shots (Data Points) ---
        const shotsGroup = svg.append('g').attr('transform', `translate(${center}, ${center})`);

        shotsGroup.selectAll('circle.shot')
            .data(shots, (d: any) => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 0)
                    .attr('fill', '#ef4444')
                    .attr('cx', d => d.x * scale)
                    .attr('cy', d => d.y * scale)
                    .call(enter => enter.transition().duration(400).ease(d3.easeBounceOut).attr('r', 4)),
                update => update.transition().duration(500)
                    .attr('cx', d => d.x * scale)
                    .attr('cy', d => d.y * scale),
                exit => exit.remove()
            );

    }, [shots, stdDev]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setStdDev(val);
        // We need to re-generate shots to match the new distribution statistically
        // Or we could move existing shots. Moving them maintains identity which is cool visually.
        // Let's scale existing shots!

        setShots(prev => {
            if (val === 0) return prev; // Avoid /0
            // Find scaling factor from old SD? Hard without storing old SD.
            // Simpler: Just regenerate for statistical accuracy.
            // But for "feel", let's regenerate.

            // Actually, regenerating on every slider move is chaotic. 
            // Better: Scale the current shots relative to their z-score!
            // x_new = x_old * (new_sd / old_sd) -- Wait, we don't track z-scores.
            // Let's just regenerate for now, effectively "reshooting".

            // To prevent chaotic flashing, we will use a debounced regenerate or just regenerate.
            // For the "Dart Board" feel, maybe we keep the random seed (z-scores) fixed?
            // That would look like the cloud expanding/contracting breathing.
            // Let's try regenerating new randoms for "fresh shots" effect.
            return prev; // Placeholder, useEffect below handles the logic
        });
    };

    // Effect to regenerate shots when SD changes, but maybe debounced or immediate?
    // Let's do: Keep same 'Z' scores, just scale position. This is best for visualization.
    // We need to store Z scores.

    // Let's refactor `shots` to store Z scores instead of raw X/Y? 
    // No, simpler: Just regenerate. It's a simulation of "Shooting with this precision".

    useEffect(() => {
        const timer = setTimeout(handleShoot, 50); // Debounce slightly
        return () => clearTimeout(timer);
    }, [stdDev]);


    // --- Chat Logic ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining Standard Deviation (SD) using a dartboard.
            Current State:
            - SD Setting: ${stdDev} (Range: 1-50)
            - Visual: ${stdDev < 10 ? "Tight cluster (High Precision)" : stdDev > 30 ? "Wild scatter (Low Precision)" : "Average spread"}
            
            Educational Goal:
            - SD is the average distance from the center (Mean).
            - Low SD = Consistent. High SD = Variable.
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
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">The Dart Board</h1>
                    <p className="text-slate-400 mt-2">Standard Deviation measures the "Spread" or "Error" of your shots.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center">
                    <svg ref={svgRef} className="w-full h-full min-h-[400px]" style={{ overflow: 'visible' }}></svg>

                    <div className="w-full max-w-md mt-6 bg-slate-800 p-4 rounded-lg">
                        <label className="flex justify-between text-slate-300 font-bold mb-2">
                            <span>Spread (Standard Deviation)</span>
                            <span className="font-mono text-amber-400">{stdDev}</span>
                        </label>
                        <input
                            type="range" min="1" max="50" value={stdDev}
                            onChange={handleSliderChange}
                            className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-2">
                            <span>Precision Sniper (Low SD)</span>
                            <span>Shotgun Spray (High SD)</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 h-[600px]">
                    <UnifiedGenAIChat
                        moduleTitle="The Dart Board"
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

export default DartBoard;
