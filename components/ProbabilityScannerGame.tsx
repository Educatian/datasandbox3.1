
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { getChatResponse } from '../services/geminiService';

interface ProbabilityScannerGameProps {
    onBack: () => void;
}

const ProbabilityScannerGame: React.FC<ProbabilityScannerGameProps> = ({ onBack }) => {
    // --- State ---
    const [zScore, setZScore] = useState<number>(0);
    const [probability, setProbability] = useState<number>(0.5);
    const [targetProb, setTargetProb] = useState<number>(0.95); // Initial Mission: 95%
    const [missionStatus, setMissionStatus] = useState<'ACTIVE' | 'SUCCESS' | 'CLOSE'>('ACTIVE');

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Commander Gem here. 🛰️ We're scanning for anomalous signals. \n\n**MISSION 1**: Isolate the **Top 5%** of signal strength.\n\nAdjust the Z-Scanner until the **Cumulative Probability** reads **95%** (0.95). Access denied below that threshold." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Refs
    const svgRef = useRef<SVGSVGElement | null>(null);

    // --- Stats Utils ---
    const normalCDF = (x: number): number => {
        var t = 1 / (1 + .2316419 * Math.abs(x));
        var d = .3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) prob = 1 - prob;
        return prob;
    };

    const pdf = (x: number) => {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
    };

    // --- Update Probability on Z Change ---
    useEffect(() => {
        const p = normalCDF(zScore);
        setProbability(p);

        // Check Mission
        const diff = Math.abs(p - targetProb);
        if (diff < 0.01) {
            if (missionStatus !== 'SUCCESS') {
                setMissionStatus('SUCCESS');
                handleSendMessage("I think I locked it in! How does it look Commander?");
            }
        } else if (diff < 0.05) {
            setMissionStatus('CLOSE');
        } else {
            setMissionStatus('ACTIVE');
        }
    }, [zScore, targetProb]);


    // --- D3 Chart ---
    useEffect(() => {
        if (!svgRef.current) return;

        const width = 900;
        const height = 450;
        const margin = { top: 30, right: 40, bottom: 50, left: 60 };

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous

        // Scales
        const x = d3.scaleLinear().domain([-4, 4]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 0.45]).range([height - margin.bottom, margin.top]);

        // Draw Axes
        const xAxis = (g: any) => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(9).tickSize(10))
            .call((g: any) => g.select(".domain").attr("stroke", "#475569").attr("stroke-width", 2))
            .call((g: any) => g.selectAll(".tick line").attr("stroke", "#475569"))
            .call((g: any) => g.selectAll(".tick text").attr("fill", "#cbd5e1").attr("class", "font-mono").style("font-size", "14px"));

        svg.append("g").call(xAxis);

        // Generate Curve Data
        const curveData: [number, number][] = [];
        for (let i = -4; i <= 4; i += 0.1) {
            curveData.push([i, pdf(i)]);
        }

        // Area Generator (Fill left of Z)
        const area = d3.area<[number, number]>()
            .x(d => x(d[0]))
            .y0(y(0))
            .y1(d => y(d[1]))
            .defined(d => d[0] <= zScore);

        // Line Generator
        const line = d3.line<[number, number]>()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        // --- Layers ---

        // 1. Full Curve Outline
        svg.append("path")
            .datum(curveData)
            .attr("fill", "none")
            .attr("stroke", "#334155")
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "6 6")
            .attr("d", line);

        // 2. Filled Area (Left of Z)
        svg.append("path")
            .datum(curveData)
            .attr("fill", "rgba(6, 182, 212, 0.3)") // Cyan-500 low opacity
            .attr("stroke", "none")
            .attr("d", area);

        // 3. Active Curve (Left of Z)
        // We filter the data to only draw the "hot" part of the line
        const activeData = curveData.filter(d => d[0] <= zScore);
        svg.append("path")
            .datum(activeData)
            .attr("fill", "none")
            .attr("stroke", "#06b6d4") // Cyan-500
            .attr("stroke-width", 5)
            .attr("filter", "drop-shadow(0 0 12px rgba(6,182,212, 0.8))")
            .attr("stroke-linecap", "round")
            .attr("d", line);

        // 4. Scanner Line controls
        const drag = d3.drag<SVGGElement, unknown>()
            .on("drag", (event) => {
                let newX = x.invert(event.x);
                newX = Math.max(-4, Math.min(4, newX));
                setZScore(newX);
            });

        const scannerGroup = svg.append("g")
            .attr("cursor", "ew-resize")
            .call(drag);

        // Scanner Laser Line
        scannerGroup.append("line")
            .attr("x1", x(zScore))
            .attr("x2", x(zScore))
            .attr("y1", margin.top)
            .attr("y2", height - margin.bottom)
            .attr("stroke", "#ec4899") // Pink-500
            .attr("stroke-width", 3)
            .attr("stroke-dasharray", "8 4");

        // Scanner Handle
        scannerGroup.append("circle")
            .attr("cx", x(zScore))
            .attr("cy", height - margin.bottom)
            .attr("r", 16)
            .attr("fill", "#ec4899")
            .attr("stroke", "white")
            .attr("stroke-width", 3)
            .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.5))");

        scannerGroup.append("text")
            .attr("x", x(zScore))
            .attr("y", height - margin.bottom + 35)
            .attr("text-anchor", "middle")
            .attr("fill", "#ec4899")
            .attr("font-weight", "bold")
            .attr("font-size", "16px")
            .text(`Z=${zScore.toFixed(2)}`);

        // Target Indicator (if reasonably visible)
        // InvNorm approx for target visuals
        // If targetProb is 0.95, targetZ ~ 1.645
        // Let's not render it to keep it a "search" mission, or render a faint hint.

    }, [zScore]); // Re-render on Z change (simple but effective for this size)


    // --- Chat Handler ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);

        // Recalculate p to avoid stale state in closure
        const currentP = normalCDF(zScore);

        const context = `
            Mission: Probability Scanner (Z-Scores)
            Role: Commander Gem (Sci-Fi Security Chief)
            Current Z-Score: ${zScore.toFixed(3)}
            Current Cumulative Probability (CDF): ${(currentP * 100).toFixed(1)}%
            Target Probability: ${(targetProb * 100).toFixed(1)}%
            Status: ${missionStatus}

            Glossary:
            - Z-Score: "Signal Frequency" or "Standard Deviations from Center"
            - Area/Prob: "Signal Strength" or "Coverage"

            Task: Find the Z-score correspond to the Target % area.
            If they are close (Status=CLOSE), encourage them "Almost locked on!".
            If SUCCESS, Congratulate them: "Signal Acquired! Z=${zScore.toFixed(2)} captures ${(currentP * 100).toFixed(1)}% of the data."
            
            Never give the answer directly unless they beg.
        `;

        try {
            // If automated success message, simulate delay
            if (msg.includes("I think I locked it in")) {
                setChatHistory(prev => [...prev,
                { role: 'model', text: `🎯 **TARGET ACQUIRED!** \n\nExcellent work, Cadet. \n\nYou've set the scanner to **Z = ${zScore.toFixed(2)}**, which covers **${(currentP * 100).toFixed(1)}%** of the distribution.\n\nThis is the critical threshold for the Top 5% of anomalies.` }
                ]);
            } else {
                const response = await getChatResponse(msg, context);
                setChatHistory(prev => [...prev, { role: 'model', text: response }]);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'model', text: "Comms offline. Keep scanning." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 bg-slate-900 border-b border-cyan-500/30 shadow-lg z-20">
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
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3">
                            The Probability Scanner 🛸
                        </h1>
                        <p className="text-sm text-slate-400 font-mono tracking-wider mt-1">ANOMALY DETECTION SYSTEM // Z-SECTOR</p>
                    </div>
                </div>
                <div className="flex items-center gap-8 text-base font-mono">
                    <div className="flex flex-col items-end text-cyan-400">
                        <span className="text-xs uppercase opacity-70">Signal Integrity</span>
                        <span className="font-bold flex items-center gap-2 text-lg">
                            ACTIVE
                            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]"></span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Dashboard */}
                <div className="flex-1 p-10 overflow-y-auto relative flex flex-col items-center justify-center">

                    {/* Scanner Viz */}
                    <div className="w-full max-w-6xl bg-slate-900/80 rounded-[2rem] border border-slate-700/50 p-8 shadow-2xl relative mb-10 backdrop-blur-sm">
                        {/* Overlay Hud */}
                        <div className="absolute top-6 left-6 font-mono text-sm text-cyan-600/80 pointer-events-none select-none">
                            SCAN_MODE: NORMAL_DIST<br />
                            SIGMA: 1.0<br />
                            MU: 0.0
                        </div>

                        <svg ref={svgRef} viewBox="0 0 900 450" className="w-full h-auto drop-shadow-lg"></svg>

                        {/* Scanner Readout */}
                        <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-700/50 px-8">
                            <div className="text-center">
                                <div className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-semibold">Current Z-Score</div>
                                <div className="text-5xl font-bold text-white font-mono tabular-nums tracking-tight">{zScore.toFixed(3)}</div>
                            </div>

                            <div className="flex-1 px-12 opacity-30">
                                <div className="h-1 bg-slate-700 rounded-full w-full"></div>
                            </div>

                            <div className="text-center">
                                <div className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-semibold">Probability (Area)</div>
                                <div className={`text-5xl font-bold font-mono tabular-nums tracking-tight transition-colors ${missionStatus === 'SUCCESS' ? 'text-green-400' : missionStatus === 'CLOSE' ? 'text-yellow-400' : 'text-cyan-400'}`}>
                                    {(probability * 100).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mission Control Panel */}
                    <div className="w-full max-w-3xl text-center">
                        <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                            Objective: Locate the <strong className="text-white font-semibold">Z-Score boundary</strong> that captures <strong className="text-white font-semibold">{(targetProb * 100)}%</strong> of the data area.
                        </p>
                        <div className="flex justify-center gap-6">
                            <button
                                onClick={() => setZScore(0)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 text-slate-200 rounded-xl text-sm font-mono border border-slate-600 transition-all shadow-lg"
                            >
                                RESET TO Z=0
                            </button>
                            <button
                                onClick={() => setZScore(1.645)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 text-slate-200 rounded-xl text-sm font-mono border border-slate-600 transition-all shadow-lg"
                            >
                                JUMP TO Z=1.645 (Ref)
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Chat Panel */}
                <div className="w-[400px] border-l border-slate-800 bg-slate-900/50 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/50">
                                <span className="text-xl">👩‍🚀</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Commander Gem</h3>
                                <p className="text-xs text-cyan-500">Security Operations</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden h-full">
                        <UnifiedGenAIChat
                            moduleTitle="Probability Scanner"
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

export default ProbabilityScannerGame;
