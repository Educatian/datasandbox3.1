
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { getChatResponse } from '../services/geminiService';

interface PredictionPainterGameProps {
    onBack: () => void;
}

const PredictionPainterGame: React.FC<PredictionPainterGameProps> = ({ onBack }) => {
    // --- State ---
    const [slope, setSlope] = useState(0.5);
    const [intercept, setIntercept] = useState(50);
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
    const [sse, setSSE] = useState(0); // Sum of Squared Errors
    const [minSSE, setMinSSE] = useState(1); // Optimal SSE (for reference)
    const [optimalSlope, setOptimalSlope] = useState(0);
    const [optimalIntercept, setOptimalIntercept] = useState(0);
    const [stability, setStability] = useState(0); // 0-100%
    const [missionStatus, setMissionStatus] = useState<'ACTIVE' | 'SUCCESS'>('ACTIVE');

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Engineering Chief Gem speaking. 🛠️\n\nOur **Quantum Beam** is misaligned using too much energy. \n\n**MISSION**: Minimize the **Total Error** (Sum of Squared Residuals).\n\nAdjust the Beam (Slope & Height) until the **Stability** reaches **95%**." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    // --- Init Data ---
    useEffect(() => {
        // Generate a noisy linear dataset
        const data = [];
        for (let i = 0; i < 15; i++) {
            const x = 10 + (points.length > 0 ? 0 : i * 5) + Math.random() * 5;
            // y = 0.8x + 20 + noise
            const y = 0.8 * (i * 6 + 10) + 20 + (Math.random() * 20 - 10);
            data.push({ x: i * 6 + 10, y });
        }
        setPoints(data);
    }, []);

    // --- Calculate Stats ---
    useEffect(() => {
        if (points.length === 0) return;

        // Calculate SSE for current line
        let currentSSE = 0;
        points.forEach(p => {
            const predictedY = slope * p.x + intercept;
            const residual = p.y - predictedY;
            currentSSE += residual * residual;
        });
        setSSE(currentSSE);

        // Calculate "Optimal" SSE for comparison (Least Squares)
        const n = points.length;
        const sumX = d3.sum(points, d => d.x);
        const sumY = d3.sum(points, d => d.y);
        const sumXY = d3.sum(points, d => d.x * d.y);
        const sumXX = d3.sum(points, d => d.x * d.x);

        const optSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const optIntercept = (sumY - optSlope * sumX) / n;
        setOptimalSlope(optSlope);
        setOptimalIntercept(optIntercept);

        let optimalSSE = 0;
        let baselineSSE = 0; // Total Sum of Squares (vs mean)

        const meanY = sumY / n;

        points.forEach(p => {
            const predOpt = optSlope * p.x + optIntercept;
            optimalSSE += Math.pow(p.y - predOpt, 2);
            baselineSSE += Math.pow(p.y - meanY, 2); // TSS
        });
        setMinSSE(optimalSSE);

        // Stability Score: 1 - (currentSSE / baselineSSE), scaled to 0-100
        // This is essentially R-squared if currentSSE is at optimal.
        // Formula: Stability = (1 - SSE/TSS) * 100, clamped.
        let score = (1 - (currentSSE / baselineSSE)) * 100;
        score = Math.max(0, Math.min(100, score));

        setStability(score);

        if (score > 95 && missionStatus !== 'SUCCESS') {
            setMissionStatus('SUCCESS');
            handleSendMessage("Beam stabilized! We are green across the board.");
        }

    }, [slope, intercept, points]);


    // --- D3 Render ---
    useEffect(() => {
        if (!svgRef.current || points.length === 0) return;

        const width = 800;
        const height = 500;
        const margin = { top: 40, right: 40, bottom: 40, left: 60 };

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Scales
        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        // Grid
        // ... (Optional)

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10))
            .attr("color", "#475569")
            .style("font-size", "12px");

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(10))
            .attr("color", "#475569")
            .style("font-size", "12px");

        // --- Optimal (OLS) Reference Line (faint) ---
        const olsY1 = optimalSlope * 0 + optimalIntercept;
        const olsY2 = optimalSlope * 100 + optimalIntercept;
        svg.append("line")
            .attr("x1", x(0))
            .attr("y1", y(olsY1))
            .attr("x2", x(100))
            .attr("y2", y(olsY2))
            .attr("stroke", "#22d3ee") // Cyan
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "8 4")
            .attr("opacity", 0.4);

        // Label for OLS line
        svg.append("text")
            .attr("x", x(95))
            .attr("y", y(olsY2) - 10)
            .attr("fill", "#22d3ee")
            .attr("opacity", 0.6)
            .attr("font-size", "11px")
            .attr("text-anchor", "end")
            .text("Optimal (OLS)");

        // --- Residual Lines (Struts) ---
        points.forEach(p => {
            const predY = slope * p.x + intercept;
            const isAbove = p.y > predY;
            const color = Math.abs(p.y - predY) > 15 ? "#ef4444" : "#fbbf24"; // Red if huge error, Yellow otherwise

            svg.append("line")
                .attr("x1", x(p.x))
                .attr("x2", x(p.x))
                .attr("y1", y(p.y))
                .attr("y2", y(predY))
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4 2")
                .attr("opacity", 0.6);
        });


        // --- Data Points ---
        svg.selectAll("circle.point")
            .data(points)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", 6)
            .attr("fill", "#22d3ee") // Cyan
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        // --- The Beam (Regression Line) ---
        // Calculate coords for x=0 and x=100
        const y1 = slope * 0 + intercept;
        const y2 = slope * 100 + intercept;

        const beamGroup = svg.append("g").attr("class", "beam-controls");

        // The Line
        beamGroup.append("line")
            .attr("x1", x(0))
            .attr("y1", y(y1))
            .attr("x2", x(100))
            .attr("y2", y(y2))
            .attr("stroke", missionStatus === 'SUCCESS' ? "#4ade80" : "#a855f7") // Green or Violet
            .attr("stroke-width", 4)
            .attr("filter", "drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))");

        // --- Interaction Handles (Invisible large targets + Visible Icons) ---

        // Handle positions on the beam
        const h1X = 10;
        const h1Y = slope * h1X + intercept;
        const h2X = 90;
        const h2Y = slope * h2X + intercept;

        // Helper to get SVG-relative data coordinates from mouse event
        const getSvgDataY = (event: any): number => {
            // Get mouse position relative to SVG element
            const svgElement = svgRef.current;
            if (!svgElement) return 0;

            const rect = svgElement.getBoundingClientRect();
            const mouseY = event.sourceEvent ? event.sourceEvent.clientY : event.clientY;

            // Convert screen coords to SVG viewBox coords
            const svgY = ((mouseY - rect.top) / rect.height) * height;

            // Convert SVG coords to data coords
            return y.invert(svgY);
        };

        // Drag Logic - now with proper coordinate conversion
        const drag1 = d3.drag<SVGCircleElement, unknown>()
            .on("drag", (event) => {
                const currentH2Y = slope * h2X + intercept; // Use current state for anchor
                const newY = getSvgDataY(event);

                // New Line passes through (h2X, currentH2Y) and (h1X, newY)
                const newSlope = (currentH2Y - newY) / (h2X - h1X);
                const newIntercept = newY - newSlope * h1X;

                setSlope(newSlope);
                setIntercept(newIntercept);
            });

        const drag2 = d3.drag<SVGCircleElement, unknown>()
            .on("drag", (event) => {
                const currentH1Y = slope * h1X + intercept; // Use current state for anchor
                const newY = getSvgDataY(event);

                // New Line passes through (h1X, currentH1Y) and (h2X, newY)
                const newSlope = (newY - currentH1Y) / (h2X - h1X);
                const newIntercept = currentH1Y - newSlope * h1X;

                setSlope(newSlope);
                setIntercept(newIntercept);
            });

        // Handle 1 (Left)
        beamGroup.append("circle")
            .attr("cx", x(h1X))
            .attr("cy", y(h1Y))
            .attr("r", 15)
            .attr("fill", "white")
            .attr("stroke", "#a855f7")
            .attr("stroke-width", 3)
            .attr("cursor", "ns-resize")
            .call(drag1);

        // Handle 2 (Right)
        beamGroup.append("circle")
            .attr("cx", x(h2X))
            .attr("cy", y(h2Y))
            .attr("r", 15)
            .attr("fill", "white")
            .attr("stroke", "#a855f7")
            .attr("stroke-width", 3)
            .attr("cursor", "ns-resize")
            .call(drag2);


    }, [points, slope, intercept, missionStatus, optimalSlope, optimalIntercept]);

    // --- Chat Handler ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);

        const context = `
            Mission: Prediction Painter (Least Squares)
            Current SSE (Error): ${sse.toFixed(0)}
            Beam Stability: ${stability.toFixed(1)}%
            Slope: ${slope.toFixed(2)}
            Intercept: ${intercept.toFixed(1)}
            
            Concept: "Least Squares" means minimizing the sum of the squared vertical distances (residuals).
            Metaphor: "Error Energy" creating tension or instability in the beam.
            
            Goal: Maximize Stability to >98%.
        `;

        try {
            if (msg.includes("Beam stabilized")) {
                setChatHistory(prev => [...prev,
                { role: 'model', text: `✅ **CALIBRATION COMPLETE** \n\nOutstanding precision. \n\nBy minimizing the **Sum of Squared Errors** (SSE), you've found the **Line of Best Fit**. \n\nStability is at maximum.` }
                ]);
            } else {
                const response = await getChatResponse(msg, context);
                setChatHistory(prev => [...prev, { role: 'model', text: response }]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsChatLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 bg-slate-900 border-b border-violet-500/30 shadow-lg z-20">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-500 flex items-center gap-3">
                            The Prediction Painter 🎨
                        </h1>
                        <p className="text-sm text-slate-400 font-mono tracking-wider mt-1">QUANTUM BEAM CALIBRATION // LEAST SQUARES</p>
                    </div>
                </div>
                <div className="flex items-center gap-8 text-base font-mono">
                    <div className="flex flex-col items-end text-violet-400">
                        <span className="text-xs uppercase opacity-70">Beam Status</span>
                        <span className="font-bold flex items-center gap-2 text-lg">
                            {missionStatus === 'SUCCESS' ? 'OPTIMAL' : 'CALIBRATING'}
                            <span className={`w-3 h-3 rounded-full ${missionStatus === 'SUCCESS' ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-yellow-400 animate-pulse'}`}></span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Dashboard */}
                <div className="flex-1 p-10 overflow-y-auto relative flex flex-col items-center justify-center">

                    {/* Viz */}
                    <div className="w-full max-w-5xl bg-slate-900/80 rounded-[2rem] border border-slate-700/50 p-8 shadow-2xl relative mb-10 backdrop-blur-sm">

                        <svg ref={svgRef} viewBox="0 0 800 500" className="w-full h-auto drop-shadow-lg"></svg>

                        {/* Readout */}
                        <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-700/50 px-8">
                            <div className="text-center">
                                <div className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-semibold">Total Error (SSE)</div>
                                <div className="text-5xl font-bold text-white font-mono tabular-nums tracking-tight">{sse.toFixed(0)}</div>
                                <div className="text-xs text-slate-500 mt-1 font-mono">Min SSE: {minSSE.toFixed(0)}</div>
                            </div>

                            <div className="flex-1 px-6 flex flex-col items-center gap-2">
                                <button
                                    onClick={() => {
                                        setSlope(optimalSlope);
                                        setIntercept(optimalIntercept);
                                    }}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:scale-105 active:scale-95"
                                >
                                    ⚡ AUTO-CALIBRATE
                                </button>
                                <span className="text-xs text-slate-500">Snap to OLS solution</span>
                            </div>

                            <div className="text-center group relative">
                                <div className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-semibold flex items-center justify-center gap-1">
                                    Beam Stability
                                    <span className="cursor-help text-slate-500">ⓘ</span>
                                </div>
                                <div className={`text-5xl font-bold font-mono tabular-nums tracking-tight transition-colors ${stability > 95 ? 'text-green-400' : 'text-violet-400'}`}>
                                    {stability.toFixed(1)}%
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-slate-300 text-xs p-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-10">
                                    Stability = (1 − SSE / TSS) × 100
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Chat Panel */}
                <div className="w-[400px] border-l border-slate-800 bg-slate-900/50 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-900/50 flex items-center justify-center border border-violet-500/50">
                                <span className="text-xl">👷‍♀️</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Chief Gem</h3>
                                <p className="text-xs text-violet-500">Structural Engineering</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden h-full">
                        <UnifiedGenAIChat
                            moduleTitle="Prediction Painter"
                            history={chatHistory}
                            isLoading={isChatLoading}
                            onSendMessage={handleSendMessage}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PredictionPainterGame;
