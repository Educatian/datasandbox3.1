
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { getChatResponse } from '../services/geminiService';

interface PredictionPainterGameProps {
    onBack: () => void;
}

type InteractionMode = 'pointer' | 'brush' | 'spray';

const PredictionPainterGame: React.FC<PredictionPainterGameProps> = ({ onBack }) => {
    // --- State ---
    const [slope, setSlope] = useState(0.5);
    const [intercept, setIntercept] = useState(50);
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
    const [sse, setSSE] = useState(0);
    const [minSSE, setMinSSE] = useState(1);
    const [optimalSlope, setOptimalSlope] = useState(0);
    const [optimalIntercept, setOptimalIntercept] = useState(0);
    const [stability, setStability] = useState(0);
    const [missionStatus, setMissionStatus] = useState<'ACTIVE' | 'SUCCESS'>('ACTIVE');
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('pointer');
    const [showConfidenceCone, setShowConfidenceCone] = useState(true);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Engineering Chief Gem speaking. 🛠️\n\nOur **Quantum Beam** is misaligned using too much energy. \n\n**MISSION**: Minimize the **Total Error** (Sum of Squared Residuals).\n\nAdjust the Beam (Slope & Height) until the **Stability** reaches **95%**.\n\nTry the **🖌 Paint** or **💨 Spray** tools to add more data points!" }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);
    const isSprayingRef = useRef(false);
    const lastSprayTimeRef = useRef(0);

    // --- Init Data ---
    useEffect(() => {
        const data = [];
        for (let i = 0; i < 15; i++) {
            const y = 0.8 * (i * 6 + 10) + 20 + (Math.random() * 20 - 10);
            data.push({ x: i * 6 + 10, y });
        }
        setPoints(data);
    }, []);

    // --- Derived Stats ---
    const meanX = useMemo(() => points.length > 0 ? d3.mean(points, d => d.x) || 50 : 50, [points]);
    const meanY = useMemo(() => points.length > 0 ? d3.mean(points, d => d.y) || 50 : 50, [points]);
    const rSquared = useMemo(() => {
        if (points.length < 2) return 0;
        const tss = d3.sum(points, d => Math.pow(d.y - meanY, 2));
        if (tss === 0) return 1;
        const rss = d3.sum(points, d => Math.pow(d.y - (slope * d.x + intercept), 2));
        return Math.max(0, Math.min(1, 1 - rss / tss));
    }, [points, slope, intercept, meanY]);

    // --- Calculate Stats ---
    useEffect(() => {
        if (points.length === 0) return;

        let currentSSE = 0;
        points.forEach(p => {
            const residual = p.y - (slope * p.x + intercept);
            currentSSE += residual * residual;
        });
        setSSE(currentSSE);

        const n = points.length;
        const sumX = d3.sum(points, d => d.x);
        const sumY = d3.sum(points, d => d.y);
        const sumXY = d3.sum(points, d => d.x * d.y);
        const sumXX = d3.sum(points, d => d.x * d.x);
        const denom = (n * sumXX - sumX * sumX);

        if (Math.abs(denom) < 1e-9) return;

        const optSlope = (n * sumXY - sumX * sumY) / denom;
        const optIntercept = (sumY - optSlope * sumX) / n;
        setOptimalSlope(optSlope);
        setOptimalIntercept(optIntercept);

        let optimalSSE = 0;
        let baselineSSE = 0;
        const mY = sumY / n;
        points.forEach(p => {
            optimalSSE += Math.pow(p.y - (optSlope * p.x + optIntercept), 2);
            baselineSSE += Math.pow(p.y - mY, 2);
        });
        setMinSSE(optimalSSE);

        let score = (1 - (currentSSE / (baselineSSE || 1))) * 100;
        score = Math.max(0, Math.min(100, score));
        setStability(score);

        if (score > 95 && missionStatus !== 'SUCCESS') {
            setMissionStatus('SUCCESS');
            handleSendMessage("Beam stabilized! We are green across the board.");
        }
    }, [slope, intercept, points]);

    // --- Add Point Helper ---
    const addPoint = (newX: number, newY: number) => {
        setPoints(prev => [...prev, { x: newX, y: newY }]);
    };

    // --- D3 Render ---
    useEffect(() => {
        if (!svgRef.current || points.length === 0) return;

        const width = 800;
        const height = 500;
        const margin = { top: 40, right: 40, bottom: 40, left: 60 };

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        // Background interaction layer
        const bgRect = svg.append('rect')
            .attr('x', margin.left).attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('fill', 'transparent')
            .style('cursor', interactionMode === 'pointer' ? 'default' : interactionMode === 'brush' ? 'crosshair' : 'cell');

        const getDataCoords = (event: any): [number, number] => {
            // d3.pointer correctly maps screen coords to SVG viewBox space
            const [px, py] = d3.pointer(event, svgRef.current!);
            return [x.invert(px), y.invert(py)];
        };

        if (interactionMode === 'brush') {
            bgRect.on('click', (event) => {
                const [nx, ny] = getDataCoords(event);
                if (nx >= 0 && nx <= 100 && ny >= 0 && ny <= 100) addPoint(nx, ny);
            });
        } else if (interactionMode === 'spray') {
            bgRect
                .on('mousedown', () => { isSprayingRef.current = true; })
                .on('mouseup mouseleave', () => { isSprayingRef.current = false; })
                .on('mousemove', (event) => {
                    if (!isSprayingRef.current) return;
                    const now = Date.now();
                    if (now - lastSprayTimeRef.current < 80) return;
                    lastSprayTimeRef.current = now;
                    const [nx, ny] = getDataCoords(event);
                    for (let i = 0; i < 2; i++) {
                        const jx = nx + (Math.random() - 0.5) * 12;
                        const jy = ny + (Math.random() - 0.5) * 12;
                        if (jx >= 0 && jx <= 100 && jy >= 0 && jy <= 100) addPoint(jx, jy);
                    }
                });
        }

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10))
            .attr("color", "#475569").style("font-size", "12px");
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(10))
            .attr("color", "#475569").style("font-size", "12px");

        // --- Confidence Cone ---
        if (showConfidenceCone && points.length > 3) {
            const se = d3.deviation(points, d => d.y - (slope * d.x + intercept)) || 5;
            const xRange = d3.range(0, 101, 2);
            const coneArea = d3.area<number>()
                .x(d => x(d))
                .y0(d => {
                    const lev = 1 + Math.pow((d - meanX) / 40, 2);
                    return y(slope * d + intercept - se * 1.5 * lev);
                })
                .y1(d => {
                    const lev = 1 + Math.pow((d - meanX) / 40, 2);
                    return y(slope * d + intercept + se * 1.5 * lev);
                });
            svg.append('path')
                .datum(xRange)
                .attr('d', coneArea as any)
                .attr('fill', 'rgba(139, 92, 246, 0.08)')
                .attr('stroke', 'rgba(139, 92, 246, 0.25)')
                .attr('stroke-width', 1)
                .style('pointer-events', 'none');
        }

        // --- OLS Reference Line ---
        svg.append("line")
            .attr("x1", x(0)).attr("y1", y(optimalSlope * 0 + optimalIntercept))
            .attr("x2", x(100)).attr("y2", y(optimalSlope * 100 + optimalIntercept))
            .attr("stroke", "#22d3ee").attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "8 4").attr("opacity", 0.35);
        svg.append("text")
            .attr("x", x(95)).attr("y", y(optimalSlope * 100 + optimalIntercept) - 10)
            .attr("fill", "#22d3ee").attr("opacity", 0.5)
            .attr("font-size", "11px").attr("text-anchor", "end").text("Optimal (OLS)");

        // --- Residual Lines ---
        points.forEach(p => {
            const predY = slope * p.x + intercept;
            const res = Math.abs(p.y - predY);
            const color = res > 15 ? "#ef4444" : "#fbbf24";
            svg.append("line")
                .attr("x1", x(p.x)).attr("x2", x(p.x))
                .attr("y1", y(p.y)).attr("y2", y(predY))
                .attr("stroke", color).attr("stroke-width", 1.5)
                .attr("stroke-dasharray", "4 2").attr("opacity", 0.5);
        });

        // --- Leverage Bubbles (Data Points) ---
        svg.selectAll("circle.point")
            .data(points)
            .enter().append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", d => {
                // Leverage: points far from meanX are "heavier"
                const leverage = Math.abs(d.x - meanX);
                return 4 + Math.min(leverage / 8, 8);
            })
            .attr("fill", d => {
                const res = Math.abs(d.y - (slope * d.x + intercept));
                if (res > 15) return '#f43f5e';
                if (res > 7) return '#fb923c';
                return '#22d3ee';
            })
            .attr("stroke", "white").attr("stroke-width", 1.5)
            .attr("opacity", 0.85)
            .style("filter", d => {
                const res = Math.abs(d.y - (slope * d.x + intercept));
                return res > 10 ? `drop-shadow(0 0 ${res / 8}px rgba(244,63,94,0.7))` : 'drop-shadow(0 0 4px rgba(34,211,238,0.4))';
            });

        // --- Fulcrum (Mean Point) ---
        if (points.length > 2) {
            svg.append('circle')
                .attr('cx', x(meanX)).attr('cy', y(meanY))
                .attr('r', 10).attr('fill', 'none')
                .attr('stroke', '#fbbf24').attr('stroke-width', 1.5).attr('opacity', 0.4);
            svg.append('circle')
                .attr('cx', x(meanX)).attr('cy', y(meanY))
                .attr('r', 5).attr('fill', '#fbbf24')
                .attr('stroke', 'white').attr('stroke-width', 2)
                .style('filter', 'drop-shadow(0 0 6px #fbbf24)');
        }

        // --- The Beam (Regression Line) ---
        const beamBlur = rSquared > 0.8 ? 2 : rSquared > 0.5 ? 5 : 10;
        const beamWidth = rSquared > 0.8 ? 3 : rSquared > 0.5 ? 5 : 8;
        const beamColor = missionStatus === 'SUCCESS' ? "#4ade80" : "#a855f7";

        // Glow layer
        svg.append("line")
            .attr("x1", x(0)).attr("y1", y(slope * 0 + intercept))
            .attr("x2", x(100)).attr("y2", y(slope * 100 + intercept))
            .attr("stroke", beamColor).attr("stroke-width", beamWidth + 6)
            .attr("opacity", 0.2)
            .style("filter", `blur(${beamBlur}px)`);

        // Core line
        svg.append("line")
            .attr("x1", x(0)).attr("y1", y(slope * 0 + intercept))
            .attr("x2", x(100)).attr("y2", y(slope * 100 + intercept))
            .attr("stroke", beamColor).attr("stroke-width", beamWidth)
            .attr("filter", `drop-shadow(0 0 ${beamBlur}px ${beamColor})`);

        // --- Drag Handles ---
        const h1X = 10, h2X = 90;
        const h1Y = slope * h1X + intercept;
        const h2Y = slope * h2X + intercept;

        const getSvgDataY = (event: any): number => {
            const svgEl = svgRef.current!;
            const rect = svgEl.getBoundingClientRect();
            const clientY = event.sourceEvent ? event.sourceEvent.clientY : event.clientY;
            const svgY = ((clientY - rect.top) / rect.height) * height;
            return y.invert(svgY);
        };

        const drag1 = d3.drag<SVGCircleElement, unknown>()
            .on("drag", (event) => {
                const currentH2Y = slope * h2X + intercept;
                const newY = getSvgDataY(event);
                const newSlope = (currentH2Y - newY) / (h2X - h1X);
                const newIntercept = newY - newSlope * h1X;
                setSlope(newSlope);
                setIntercept(newIntercept);
            });

        const drag2 = d3.drag<SVGCircleElement, unknown>()
            .on("drag", (event) => {
                const currentH1Y = slope * h1X + intercept;
                const newY = getSvgDataY(event);
                const newSlope = (newY - currentH1Y) / (h2X - h1X);
                const newIntercept = currentH1Y - newSlope * h1X;
                setSlope(newSlope);
                setIntercept(newIntercept);
            });

        if (interactionMode === 'pointer') {
            const beamGroup = svg.append("g");
            [{ hX: h1X, hY: h1Y, drag: drag1 }, { hX: h2X, hY: h2Y, drag: drag2 }].forEach(({ hX, hY, drag }) => {
                beamGroup.append("circle")
                    .attr("cx", x(hX)).attr("cy", y(hY)).attr("r", 14)
                    .attr("fill", "white").attr("stroke", beamColor).attr("stroke-width", 3)
                    .attr("cursor", "ns-resize").call(drag as any);
            });
        }

    }, [points, slope, intercept, missionStatus, optimalSlope, optimalIntercept, interactionMode, showConfidenceCone, meanX, meanY, rSquared]);

    // --- Chat Handler ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);
        const context = `Mission: Prediction Painter. SSE: ${sse.toFixed(0)}, Stability: ${stability.toFixed(1)}%, R²: ${rSquared.toFixed(3)}, N: ${points.length}, Tool: ${interactionMode}`;
        try {
            if (msg.includes("Beam stabilized")) {
                setChatHistory(prev => [...prev, { role: 'model', text: `✅ **CALIBRATION COMPLETE**\n\nBy minimizing SSE, you found the **Line of Best Fit**. Stability is at maximum.` }]);
            } else {
                const response = await getChatResponse(msg, context);
                setChatHistory(prev => [...prev, { role: 'model', text: response }]);
            }
        } catch (e) { console.error(e); }
        finally { setIsChatLoading(false); }
    };

    const toolConfig: { mode: InteractionMode; label: string; emoji: string; activeClass: string }[] = [
        { mode: 'pointer', label: 'Adjust', emoji: '🖱', activeClass: 'bg-teal-500/20 border-teal-500 text-teal-300' },
        { mode: 'brush', label: 'Paint', emoji: '🖌', activeClass: 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300' },
        { mode: 'spray', label: 'Spray', emoji: '💨', activeClass: 'bg-orange-500/20 border-orange-500 text-orange-300' },
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-4 bg-slate-900 border-b border-violet-500/30 shadow-lg z-20 flex-shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} aria-label="Back to Portal" className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-500">
                            The Prediction Painter 🎨
                        </h1>
                        <p className="text-xs text-slate-400 font-mono tracking-wider mt-0.5">QUANTUM BEAM CALIBRATION // LEAST SQUARES</p>
                    </div>
                </div>
                <div className="flex items-center gap-8 text-base font-mono">
                    <div className="flex flex-col items-end text-violet-400">
                        <span className="text-xs uppercase opacity-70">Beam Status</span>
                        <span className="font-bold flex items-center gap-2 text-lg">
                            {missionStatus === 'SUCCESS' ? 'OPTIMAL' : 'CALIBRATING'}
                            <span aria-hidden="true" className={`w-3 h-3 rounded-full ${missionStatus === 'SUCCESS' ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-yellow-400 animate-pulse'}`}></span>
                        </span>
                    </div>
                    <div className="flex flex-col items-end text-slate-300">
                        <span className="text-xs uppercase opacity-70">R²</span>
                        <span className="font-bold text-lg text-yellow-400">{rSquared.toFixed(3)}</span>
                    </div>
                    <div className="flex flex-col items-end text-slate-300">
                        <span className="text-xs uppercase opacity-70">N Points</span>
                        <span className="font-bold text-lg">{points.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* Main Chart */}
                <div className="flex-1 min-w-0 p-2 flex flex-col items-stretch overflow-hidden">
                    <div className="w-full h-full bg-slate-900/80 rounded-2xl border border-slate-700/50 p-2 shadow-2xl backdrop-blur-sm flex flex-col">
                        <svg ref={svgRef} viewBox="0 0 800 500" className="w-full flex-1 drop-shadow-lg" preserveAspectRatio="xMidYMid meet" />
                    </div>
                </div>

                {/* Right Chat Panel — Chief Gem */}
                <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/50 flex flex-col">
                    <div className="p-3 border-b border-slate-800 bg-slate-900 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-violet-900/50 flex items-center justify-center border border-violet-500/50">
                                <span className="text-lg">👷‍♀️</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100 text-sm">Chief Gem</h3>
                                <p className="text-xs text-violet-500">Structural Engineering</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
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

            {/* Bottom Control Bar */}
            <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center gap-3">
                {/* Tool Selector */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                    {toolConfig.map(({ mode, label, emoji, activeClass }) => (
                        <button key={mode} onClick={() => setInteractionMode(mode)}
                            className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all ${interactionMode === mode ? activeClass : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}>
                            {emoji} {label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-slate-700" />

                {/* Confidence Cone Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Cone</span>
                    <button onClick={() => setShowConfidenceCone(!showConfidenceCone)}
                        aria-label="Toggle confidence cone"
                        aria-pressed={showConfidenceCone}
                        className={`w-9 h-5 rounded-full transition-colors relative ${showConfidenceCone ? 'bg-violet-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showConfidenceCone ? 'left-5' : 'left-1'}`} />
                    </button>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-slate-700" />

                {/* Metrics */}
                <div className="flex items-center gap-4 font-mono">
                    <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase">SSE</div>
                        <div className="text-sm font-bold text-white">{sse.toFixed(0)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase">Min SSE</div>
                        <div className="text-sm font-bold text-slate-400">{minSSE.toFixed(0)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[9px] text-slate-500 uppercase">Stability</div>
                        <div className={`text-sm font-bold ${stability > 95 ? 'text-green-400' : 'text-violet-400'}`}>{stability.toFixed(1)}%</div>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-slate-700" />

                {/* Legend dots */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] inline-block"></span>Low</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#fb923c] inline-block"></span>Mid</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] inline-block"></span>High</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] inline-block"></span>Mean</span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action Buttons */}
                <button onClick={() => { setSlope(optimalSlope); setIntercept(optimalIntercept); }}
                    className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95">
                    <span aria-hidden="true">⚡</span> Auto-Calibrate
                </button>
                <button onClick={() => {
                    const data: { x: number, y: number }[] = [];
                    for (let i = 0; i < 15; i++) {
                        const yv = 0.8 * (i * 6 + 10) + 20 + (Math.random() * 20 - 10);
                        data.push({ x: i * 6 + 10, y: yv });
                    }
                    setPoints(data);
                    setMissionStatus('ACTIVE');
                }}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-all">
                    <span aria-hidden="true">🔄</span> Reset
                </button>
            </div>
        </div>
    );
};

export default PredictionPainterGame;
