
import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import DataContextCard from './ui/DataContextCard';
import { getDataset, GroupedDataset } from '../data/realDatasets';

interface BoxPlotBuilderProps {
    onBack: () => void;
}

const MICHELSON = getDataset('michelson-speed') as GroupedDataset;
/** Keep loaded real data draggable: cap how many points we plot at once. */
const MAX_REAL_POINTS = 25;
/** True speed of light (299,792 km/s) on the dataset's km/s-minus-299,000 offset scale. */
const TRUE_C_OFFSET = 792;

/** 1-D linear rescale of a value from [lo, hi] into the module's working range. */
const rescale1D = (v: number, lo: number, hi: number, min = 5, max = 95): number =>
    hi === lo ? (min + max) / 2 : min + ((v - lo) / (hi - lo)) * (max - min);

const BoxPlotBuilder: React.FC<BoxPlotBuilderProps> = ({ onBack }) => {
    // Initial Data: a simple spread
    const [data, setData] = useState<number[]>([10, 25, 40, 45, 50, 55, 60, 75, 90]);
    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Greetings! Dr. Gem here. 📦 Let's pack some data! Drag those points around and I'll help you make sense of the Quartiles." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Real-data (Michelson 1879) state
    const [realGroup, setRealGroup] = useState<string>('all');
    const [realActive, setRealActive] = useState(false);
    const [realShown, setRealShown] = useState<{ shown: number; total: number } | null>(null);
    // Canvas position of the true speed of light (792 on the offset scale), when in range
    const [trueCPosition, setTrueCPosition] = useState<number | null>(null);

    const svgRef = useRef<SVGSVGElement | null>(null);

    const loadMichelson = (groupKey: string) => {
        const values = groupKey === 'all'
            ? MICHELSON.groups.flatMap(g => g.values)
            : (MICHELSON.groups.find(g => g.label === groupKey)?.values ?? []);
        if (values.length === 0) return;

        // Sample evenly if the selection exceeds the point cap
        let chosen = values;
        if (values.length > MAX_REAL_POINTS) {
            const step = values.length / MAX_REAL_POINTS;
            chosen = Array.from({ length: MAX_REAL_POINTS }, (_, i) => values[Math.floor(i * step)]);
        }

        const lo = Math.min(...chosen);
        const hi = Math.max(...chosen);
        setData(chosen.map(v => rescale1D(v, lo, hi)));

        const cPos = rescale1D(TRUE_C_OFFSET, lo, hi);
        setTrueCPosition(cPos >= 0 && cPos <= 100 ? cPos : null);
        setRealActive(true);
        setRealShown({ shown: chosen.length, total: values.length });

        const label = groupKey === 'all' ? 'all 100 measurements' : groupKey;
        setChatHistory(prev => [...prev, {
            role: 'model' as const,
            text: `Loaded Michelson's 1879 speed-of-light data (${label}). Every point is a real measurement, rescaled to this canvas. The dashed green line marks the true speed of light, 299,792 km/s. Where does the median sit relative to it?`
        }]);
    };

    const handleRandomize = () => {
        setData(d => d.map(() => Math.random() * 80 + 10));
        setRealActive(false);
        setRealShown(null);
        setTrueCPosition(null);
    };

    // Statistics
    const stats = useMemo(() => {
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = d3.quantile(sorted, 0.25) || 0;
        const median = d3.quantile(sorted, 0.5) || 0;
        const q3 = d3.quantile(sorted, 0.75) || 0;
        const iqr = q3 - q1;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        // Standard definition of whiskers: max 1.5 IQR
        // Ideally we find the closest data point within 1.5 IQR, but for this visualizer simple min/max whiskers is clearer for beginners, 
        // OR we show 1.5 IQR fences. Let's show simple Min/Max whiskers for "Range" understanding.
        return { min, q1, median, q3, max, iqr };
    }, [data]);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = 600;
        const height = 400;
        const margin = { top: 40, right: 50, bottom: 40, left: 100 };

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Scale (Vertical)
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        // Axis
        const axis = d3.axisLeft(y);
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(axis)
            .attr('color', 'rgb(148 163 184)')
            .style('font-size', '12px');

        // --- Drag Handling ---
        const drag = d3.drag<SVGCircleElement, number>()
            .on('drag', function (event, d) {
                const newVal = y.invert(event.y);
                const clamped = Math.max(0, Math.min(100, newVal));

                // Identify which point index we are dragging
                // Since values can be duplicate, we rely on the index passed to data()
                // But d3 v6 passes (event, d) where d is datum.
                // We need the index. We can capture it in the selection below.
            });

        // We handle data update via index in the render loop below to avoid complex state sync in drag
        // For simplicity in this demo, let's just make points separate from the box plot visualization
        // The Box Plot is calculated from the points.

        // --- 1. The Raw Data Points (Left Side) ---
        const pointsGroup = svg.append('g').attr('transform', `translate(${margin.left + 50}, 0)`);

        pointsGroup.append('text').attr('x', 0).attr('y', margin.top - 20).text('Raw Data').attr('fill', '#94a3b8').attr('text-anchor', 'middle').style('font-size', '12px');

        pointsGroup.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', 0)
            .attr('cy', d => y(d))
            .attr('r', 8)
            .attr('fill', '#38bdf8') // Sky-400
            .attr('stroke', '#0c4a6e')
            .attr('stroke-width', 2)
            .style('cursor', 'ns-resize')
            .call(d3.drag<SVGCircleElement, number>()
                .on('drag', (event, d) => {
                    // We need to find the index of this exact datum. 
                    // This is tricky with duplicates. 
                    // Let's rely on the React State Re-render for smooth interaction
                    // but we need the index.
                    // Hack: We will attach index to the data object if we convert to objects.
                    // Or simpler: Map data to objects in React state.
                }) as any
            );

        // To fix drag properly, let's wrap logic in a way that we can update specific indices.
        // We will just redraw purely based on React state, but D3 drag needs to trigger setState.
        // Let's implement the drag behavior inside the useEffect using index closure if possible
        // OR better: Render circles in React, not D3, for the interactive parts?
        // No, let's stick to D3 for the box plot drawing logic.

        // Re-implementing with index-based data binding:
        const indexedData = data.map((val, i) => ({ val, id: i }));

        pointsGroup.selectAll('circle')
            .data(indexedData, (d: any) => d.id)
            .join('circle')
            .attr('cx', 0)
            .attr('cy', d => y(d.val))
            .attr('r', 8)
            .attr('fill', '#38bdf8')
            .style('cursor', 'ns-resize')
            .call(d3.drag<SVGCircleElement, { val: number, id: number }>()
                .on('drag', (event, d) => {
                    const newVal = Math.max(0, Math.min(100, y.invert(event.y)));
                    // Update state
                    const newData = [...data];
                    newData[d.id] = newVal;
                    setData(newData); // Triggers re-render
                }) as any
            );

        // --- 2. The Box Plot (Right Side) ---
        const boxCenter = margin.left + 200;
        const boxWidth = 60;
        const boxGroup = svg.append('g');

        boxGroup.append('text').attr('x', boxCenter).attr('y', margin.top - 20).text('Box & Whisker').attr('fill', '#94a3b8').attr('text-anchor', 'middle').style('font-size', '12px');

        // Main vertical line (range)
        boxGroup.append('line')
            .attr('x1', boxCenter)
            .attr('x2', boxCenter)
            .attr('y1', y(stats.min))
            .attr('y2', y(stats.max))
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        // Box (IQR)
        boxGroup.append('rect')
            .attr('x', boxCenter - boxWidth / 2)
            .attr('y', y(stats.q3))
            .attr('width', boxWidth)
            .attr('height', Math.abs(y(stats.q1) - y(stats.q3)))
            .attr('fill', '#6366f1') // Indigo-500
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Median Line
        boxGroup.append('line')
            .attr('x1', boxCenter - boxWidth / 2)
            .attr('x2', boxCenter + boxWidth / 2)
            .attr('y1', y(stats.median))
            .attr('y2', y(stats.median))
            .attr('stroke', '#facc15') // Yellow-400
            .attr('stroke-width', 3);

        // Whisker Caps
        [stats.min, stats.max].forEach(val => {
            boxGroup.append('line')
                .attr('x1', boxCenter - boxWidth / 4)
                .attr('x2', boxCenter + boxWidth / 4)
                .attr('y1', y(val))
                .attr('y2', y(val))
                .attr('stroke', 'white')
                .attr('stroke-width', 1);
        });

        // Labels
        const labelOffset = boxWidth / 2 + 10;
        const addLabel = (val: number, text: string, color = '#94a3b8') => {
            boxGroup.append('text')
                .attr('x', boxCenter + labelOffset)
                .attr('y', y(val))
                .attr('dy', '0.35em')
                .text(`${text}: ${val.toFixed(0)}`)
                .attr('fill', color)
                .style('font-size', '11px');
        };

        addLabel(stats.max, 'Max');
        addLabel(stats.q3, 'Q3');
        addLabel(stats.median, 'Median', '#facc15');
        addLabel(stats.q1, 'Q1');
        addLabel(stats.min, 'Min');

        // Connecting lines (Visualization aid)
        // Draw faint lines from data to box plot if sorted? Too messy.
        // Instead, just dashed lines from stats to axis

        // --- 3. True speed-of-light reference line (Michelson real data) ---
        if (trueCPosition !== null) {
            const cy = y(trueCPosition);
            svg.append('line')
                .attr('x1', margin.left + 10)
                .attr('x2', boxCenter + boxWidth / 2)
                .attr('y1', cy)
                .attr('y2', cy)
                .attr('stroke', '#34d399') // Emerald-400
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '6 4');
            svg.append('text')
                .attr('x', boxCenter + boxWidth / 2)
                .attr('y', cy - 6)
                .attr('text-anchor', 'end')
                .attr('fill', '#34d399')
                .style('font-size', '11px')
                .text('True speed of light (792)');
        }

    }, [data, stats, trueCPosition]);

    const handleSendMessage = async (message: string) => {
        const newHistory = [...chatHistory, { role: 'user' as const, text: message }];
        setChatHistory(newHistory);
        setIsChatLoading(true);

        const context = `
            Current Box Plot Stats:
            Min: ${stats.min}, Q1: ${stats.q1}, Median: ${stats.median}, Q3: ${stats.q3}, Max: ${stats.max}, IQR: ${stats.iqr}
            Data Points: [${data.map(d => d.toFixed(0)).join(', ')}]
            User Context: Learning about Box Plots, Quartiles, and Interquartile Range.
            ${realActive ? `The points are REAL data: Michelson's 1879 speed-of-light measurements (${realGroup === 'all' ? 'all 5 experiments' : realGroup}), linearly rescaled from a km/s-minus-299,000 offset scale onto this 0-100 canvas. The true speed of light is 299,792 km/s (792 on the offset scale)${trueCPosition !== null ? `, which sits at ${trueCPosition.toFixed(1)} on the canvas, marked by the dashed green line` : ''}. Source: ${MICHELSON.source}. Context: ${MICHELSON.contextNote} Ground explanations of the box, median, and spread in this measurement-variability story.` : ''}
        `;

        try {
            const response = await getChatResponse(message, context);
            setChatHistory(prev => [...prev, { role: 'model' as const, text: response }]);
        } catch (error) {
            console.error("Chat error:", error);
            setChatHistory(prev => [...prev, { role: 'model' as const, text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-400">The Box Plot Packer</h1>
                    <p className="text-slate-400 mt-2">Drag the blue data points to reshape the box.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4">
                    <svg ref={svgRef} className="w-full h-full min-h-[400px]"></svg>
                </div>

                <div className="lg:col-span-1 flex flex-col space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-indigo-400 mb-4">Stats Summary</h3>
                        <div className="space-y-2 font-mono text-sm">
                            <div className="flex justify-between"><span className="text-slate-400">Range:</span> <span>{stats.max.toFixed(0)} - {stats.min.toFixed(0)} = {(stats.max - stats.min).toFixed(0)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">IQR (Box Height):</span> <span>{stats.q3.toFixed(0)} - {stats.q1.toFixed(0)} = {stats.iqr.toFixed(0)}</span></div>
                            <div className="flex justify-between text-yellow-400 font-bold border-t border-slate-700 pt-2"><span>Median:</span> <span>{stats.median.toFixed(1)}</span></div>
                        </div>
                        <button onClick={handleRandomize} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 p-2 rounded text-white">Randomize Data</button>
                    </div>

                    {/* Real Data: Michelson 1879 */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-3">Load Real Data</h3>
                        <p className="text-sm text-slate-400 mb-3">
                            Michelson's 1879 speed-of-light measurements: pick one experiment, or all 100.
                        </p>
                        <label className="text-xs text-slate-400 block mb-1 uppercase tracking-wider font-bold" htmlFor="michelson-group-select">Experiment</label>
                        <select
                            id="michelson-group-select"
                            value={realGroup}
                            onChange={(e) => setRealGroup(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 outline-none"
                        >
                            {MICHELSON.groups.map(g => (
                                <option key={g.label} value={g.label}>{g.label} ({g.values.length} values)</option>
                            ))}
                            <option value="all">All 100 measurements</option>
                        </select>
                        <button
                            onClick={() => loadMichelson(realGroup)}
                            className="mt-3 w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            Load Measurements
                        </button>
                        {realActive && realShown && realShown.shown < realShown.total && (
                            <p className="mt-2 text-xs text-slate-500">
                                Showing {realShown.shown} of {realShown.total} measurements, evenly sampled so every point stays draggable.
                            </p>
                        )}
                        {realActive && (
                            <p className="mt-2 text-xs text-emerald-300/80 leading-snug">
                                Values are km/s minus 299,000, rescaled to this canvas. The true speed of light is 299,792 km/s, that is 792 on the offset scale{trueCPosition !== null ? ': the dashed green line shows where it falls relative to the box' : ''}.
                            </p>
                        )}
                    </div>

                    {realActive && <DataContextCard dataset={MICHELSON} />}
                    {/* Chat - constrained height to improve graph visibility */}
                    <div className="h-[300px] rounded-lg">
                        <UnifiedGenAIChat
                            moduleTitle="The Box Plot Packer"
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

export default BoxPlotBuilder;
