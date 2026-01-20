import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface BalanceBeamProps {
    onBack: () => void;
}

const INITIAL_WEIGHTS = [10, 20, 30, 40, 50];

const BalanceBeam: React.FC<BalanceBeamProps> = ({ onBack }) => {
    const [weights, setWeights] = useState<number[]>(INITIAL_WEIGHTS);
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to The Balance Beam! ⚖️ I'm Dr. Gem. Drag the blue weights and watch how the Mean chases them while the Median stays calm.", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Statistics
    const mean = d3.mean(weights) || 0;
    const median = d3.median(weights) || 0;

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 800;
        const height = 400;
        const margin = { top: 50, right: 50, bottom: 100, left: 50 };
        const svg = d3.select(svgRef.current);

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Scales
        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);

        // --- Static Elements ---

        // The Beam
        svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', height / 2)
            .attr('y2', height / 2)
            .attr('stroke', '#cbd5e1') // slate-300
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round');

        // Number Line Ticks
        const axisGroup = svg.append('g')
            .attr('transform', `translate(0, ${height / 2 + 20})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(10))
            .attr('color', '#64748b'); // slate-500

        axisGroup.select('.domain').remove(); // Hide axis line, keep ticks

        // --- Dynamic Elements ---

        // The Fulcrum (Mean)
        const fulcrumGroup = svg.append('g')
            .attr('transform', `translate(${x(mean)}, ${height / 2 + 10})`);

        // Triangle
        fulcrumGroup.append('path')
            .attr('d', 'M 0 0 L 15 30 L -15 30 Z')
            .attr('fill', '#f59e0b') // Amber-500
            .attr('stroke', '#78350f')
            .attr('stroke-width', 2);

        // Label
        fulcrumGroup.append('text')
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f59e0b')
            .attr('font-weight', 'bold')
            .text(`MEAN: ${mean.toFixed(1)}`);

        // The Median Marker
        const medianGroup = svg.append('g')
            .attr('transform', `translate(${x(median)}, ${height / 2 - 60})`);

        medianGroup.append('line')
            .attr('y1', 0)
            .attr('y2', 50)
            .attr('stroke', '#22d3ee') // Cyan-400
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        medianGroup.append('rect')
            .attr('x', -40)
            .attr('y', -30)
            .attr('width', 80)
            .attr('height', 30)
            .attr('rx', 5)
            .attr('fill', '#0891b2'); // Cyan-600

        medianGroup.append('text')
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .text(`MEDIAN: ${median.toFixed(1)}`);


        // --- Weights (Draggable) ---

        const drag = d3.drag<SVGGElement, number>()
            .subject((e, d) => ({ x: x(d), y: height / 2 - 25 }))
            .on('drag', function (event, d) {
                const newXVal = Math.max(0, Math.min(100, x.invert(event.x)));
                // Update local visual immediately for smoothness
                d3.select(this).attr('transform', `translate(${x(newXVal)}, ${height / 2 - 25})`);

                // We need to find which index this weight corresponds to.
                // Since d3 binds data by value by default for primitives, 
                // and we might have duplicates, this is tricky.
                // Better approach: Bind objects with IDs in React, passing to D3.
            })
            .on('end', function (event, d) {
                // Trigger React state update on drop
                const newXVal = Math.max(0, Math.min(100, x.invert(event.x)));

                // Find the closest weight value in the array to the *original* d (drag start)
                // and update it. This is a bit hacky for a pure D3 integration inside React
                // without distinct IDs, but sufficient for this demo.
                // A better way is to update state `on('drag')` but throttled.

                // Let's implement a simpler "replace one instance" logic:
                setWeights(prev => {
                    const idx = prev.indexOf(d);
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next[idx] = newXVal;
                    return next.sort((a, b) => a - b); // Keep sorted for median logic visual stability
                });
            });

        // For the D3 data join, we need to map weights to objects with IDs to handle drag correctly
        // But to keep it simple with the current state structure, we'll re-render on every state change
        // and just use index as key for the selection if values are unique enough, or just index.

        const weightData = weights.map((w, i) => ({ val: w, id: i }));

        const weightNodes = svg.append('g').selectAll('g')
            .data(weightData, (d: any) => d.id)
            .join('g')
            .attr('transform', d => `translate(${x(d.val)}, ${height / 2 - 25})`)
            .attr('cursor', 'grab')
            .call(d3.drag<SVGGElement, { val: number, id: number, offsetX?: number }>()
                .subject(function(event, d) {
                    // Set subject to current position for stable drag start
                    return { x: x(d.val), y: height / 2 - 25 };
                })
                .on('start', function(event, d) {
                    // Store offset between mouse and box center at drag start
                    const [mx] = d3.pointer(event, svg.node());
                    d.offsetX = mx - x(d.val);
                    d3.select(this).attr('cursor', 'grabbing');
                })
                .on('drag', function (event, d) {
                    // Use pointer for consistent coordinate system and apply offset
                    const [mx] = d3.pointer(event, svg.node());
                    const newX = Math.max(0, Math.min(100, x.invert(mx - (d.offsetX || 0))));
                    d3.select(this).attr('transform', `translate(${x(newX)}, ${height / 2 - 25})`);
                    // Update text label inside with decimal
                    d3.select(this).select('text').text(newX.toFixed(1));

                    // Live update state
                    setWeights(prev => {
                        const next = [...prev];
                        next[d.id] = newX;
                        return next;
                    });
                })
                .on('end', function() {
                    d3.select(this).attr('cursor', 'grab');
                }) as any
            );

        weightNodes.append('rect')
            .attr('x', -20)
            .attr('y', -20)
            .attr('width', 40)
            .attr('height', 40)
            .attr('rx', 8)
            .attr('fill', '#3b82f6') // Blue-500
            .attr('stroke', '#1e3a8a')
            .attr('stroke-width', 2)
            .attr('filter', 'drop-shadow(0px 4px 2px rgba(0,0,0,0.3))');

        weightNodes.append('text')
            .attr('y', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .attr('pointer-events', 'none') // Let clicks pass to rect
            .text(d => d.val.toFixed(1));

    }, [weights]); // Re-render whenever weights change

    // --- Chat Logic ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining Mean vs Median.
            Current State:
            - Mean (Fulcrum): ${mean.toFixed(1)}
            - Median (Middle): ${median.toFixed(1)}
            - Weights: [${weights.map(n => n.toFixed(0)).join(', ')}]
            
            Educational Goal:
            - Show that the Mean follows the "weight" (magnitude) of numbers.
            - Show that the Median only cares about "order".
            - Ask user to drag one weight to 99 (outlier) to see the mean chase it.
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

    const handleReset = () => setWeights(INITIAL_WEIGHTS);
    const handleOutlier = () => {
        const sorted = [...weights].sort((a, b) => a - b);
        const q1 = d3.quantile(sorted, 0.25) || 0;
        const q3 = d3.quantile(sorted, 0.75) || 0;
        const iqr = q3 - q1;
        const outlierValue = Math.min(q3 + 1.5 * iqr, 100);
        
        const newWeights = [...weights];
        newWeights[newWeights.length - 1] = outlierValue;
        setWeights(newWeights);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">The Balance Beam</h1>
                    <p className="text-slate-400 mt-2">Mean = Center of Gravity (Balance). Median = Center of Count (Middle).</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center">
                    <svg ref={svgRef} className="w-full h-full min-h-[400px]" style={{ overflow: 'visible' }}></svg>

                    <div className="flex gap-4 mt-4">
                        <button onClick={handleReset} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white">Reset Weights</button>
                        <button onClick={handleOutlier} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-bold">Create Outlier!</button>
                    </div>
                </div>

                <div className="lg:col-span-1 h-[600px]">
                    <UnifiedGenAIChat
                        moduleTitle="The Balance Beam"
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

export default BalanceBeam;
