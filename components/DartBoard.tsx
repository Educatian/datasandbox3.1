import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import { logEvent } from '../services/loggingService';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { generateSampleData } from '../services/statisticsService';

interface DartBoardProps {
    onBack: () => void;
}

interface Shot {
    id: number;
    x: number;
    y: number;
    distance: number;
}

// Educational context labels based on relative SD position
const getSkillLabel = (stdDev: number, max: number = 50): { emoji: string; label: string; example: string } => {
    const ratio = stdDev / max;
    if (ratio <= 0.2) return { emoji: '🎯', label: 'Olympic Athlete', example: 'Exam: Most scores 70-80' };
    if (ratio <= 0.5) return { emoji: '🏹', label: 'Skilled Player', example: 'Bus: ±5 min variance' };
    if (ratio <= 0.8) return { emoji: '🎪', label: 'Beginner', example: 'Factory: Higher defect rate' };
    return { emoji: '🌪️', label: 'Random', example: 'Unpredictable' };
};

const DartBoard: React.FC<DartBoardProps> = ({ onBack }) => {
    const [stdDev, setStdDev] = useState(10);
    const [shots, setShots] = useState<Shot[]>([]);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [player2StdDev, setPlayer2StdDev] = useState(30);
    const [player2Shots, setPlayer2Shots] = useState<Shot[]>([]);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to The Dart Board! 🎯 I'm Dr. Gem. Adjust the slider to see how Standard Deviation changes the spread of your shots.", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);
    const svg2Ref = useRef<SVGSVGElement | null>(null);

    // Calculate coverage statistics
    const calculateCoverage = (shotList: Shot[], coveragePercent: number): { radius: number; count: number } => {
        if (shotList.length === 0) return { radius: 0, count: 0 };
        const sortedDistances = shotList.map(s => s.distance).sort((a, b) => a - b);
        const targetIndex = Math.floor(shotList.length * coveragePercent) - 1;
        const radius = sortedDistances[Math.max(0, targetIndex)] || 0;
        const count = shotList.filter(s => s.distance <= radius).length;
        return { radius, count };
    };

    // Coverage stats for player 1
    const coverage50 = useMemo(() => calculateCoverage(shots, 0.5), [shots]);
    const coverage80 = useMemo(() => calculateCoverage(shots, 0.8), [shots]);
    const coverage95 = useMemo(() => calculateCoverage(shots, 0.95), [shots]);

    // Coverage stats for player 2
    const p2Coverage50 = useMemo(() => calculateCoverage(player2Shots, 0.5), [player2Shots]);
    const p2Coverage80 = useMemo(() => calculateCoverage(player2Shots, 0.8), [player2Shots]);

    // Average distance from center
    const avgDistance = useMemo(() => {
        if (shots.length === 0) return 0;
        return shots.reduce((sum, s) => sum + s.distance, 0) / shots.length;
    }, [shots]);

    const p2AvgDistance = useMemo(() => {
        if (player2Shots.length === 0) return 0;
        return player2Shots.reduce((sum, s) => sum + s.distance, 0) / player2Shots.length;
    }, [player2Shots]);

    // Initial Shots
    useEffect(() => {
        handleShoot();
    }, []);

    // Generate new shots when SD changes
    const handleShoot = (sd: number = stdDev, isPlayer2: boolean = false) => {
        const count = 50;
        const xs = generateSampleData(0, sd, count);
        const ys = generateSampleData(0, sd, count);

        const newShots = xs.map((x, i) => ({
            id: Date.now() + i + (isPlayer2 ? 1000 : 0),
            x: x,
            y: ys[i],
            distance: Math.hypot(x, ys[i])
        }));

        if (isPlayer2) {
            setPlayer2Shots(newShots);
        } else {
            setShots(newShots);
        }
    };

    // Render D3
    const renderBoard = (
        svgElement: SVGSVGElement | null,
        shotList: Shot[],
        sd: number,
        cov50: { radius: number; count: number },
        cov80: { radius: number; count: number },
        cov95?: { radius: number; count: number }
    ) => {
        if (!svgElement) return;

        const width = comparisonMode ? 350 : 500;
        const height = comparisonMode ? 350 : 500;
        const center = width / 2;
        const svg = d3.select(svgElement);

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const boardGroup = svg.append('g').attr('transform', `translate(${center}, ${center})`);
        const scale = comparisonMode ? 3 : 4;

        // Background rings (faint)
        const rings = [140, 100, 60, 20].map(r => r * (comparisonMode ? 0.7 : 1));
        boardGroup.selectAll('circle.board-ring')
            .data(rings)
            .join('circle')
            .attr('class', 'board-ring')
            .attr('r', d => d)
            .attr('fill', (d, i) => i % 2 === 0 ? 'white' : 'black')
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 1)
            .attr('opacity', 0.1);

        // Crosshairs
        boardGroup.append('line').attr('x1', -center).attr('x2', center).attr('y1', 0).attr('y2', 0).attr('stroke', '#475569').attr('stroke-dasharray', '4,4');
        boardGroup.append('line').attr('y1', -center).attr('y2', center).attr('x1', 0).attr('x2', 0).attr('stroke', '#475569').attr('stroke-dasharray', '4,4');

        // Coverage circles (50%, 80%, 95%)
        const coverageData = [
            { pct: 50, data: cov50, color: '#22c55e', label: '50%' },
            { pct: 80, data: cov80, color: '#3b82f6', label: '80%' },
            ...(cov95 ? [{ pct: 95, data: cov95, color: '#8b5cf6', label: '95%' }] : [])
        ];

        coverageData.forEach(({ data, color, label }) => {
            boardGroup.append('circle')
                .attr('r', data.radius * scale)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            boardGroup.append('text')
                .attr('x', data.radius * scale + 5)
                .attr('y', -5)
                .attr('fill', color)
                .attr('font-size', '11px')
                .attr('font-weight', 'bold')
                .text(label);
        });

        // Shots
        const shotsGroup = svg.append('g').attr('transform', `translate(${center}, ${center})`);
        shotsGroup.selectAll('circle.shot')
            .data(shotList, (d: any) => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 0)
                    .attr('fill', '#ef4444')
                    .attr('cx', d => d.x * scale)
                    .attr('cy', d => d.y * scale)
                    .call(enter => enter.transition().duration(400).ease(d3.easeBounceOut).attr('r', comparisonMode ? 3 : 4)),
                update => update.transition().duration(500)
                    .attr('cx', d => d.x * scale)
                    .attr('cy', d => d.y * scale),
                exit => exit.remove()
            );
    };

    useEffect(() => {
        renderBoard(svgRef.current, shots, stdDev, coverage50, coverage80, coverage95);
    }, [shots, stdDev, coverage50, coverage80, coverage95, comparisonMode]);

    useEffect(() => {
        if (comparisonMode) {
            renderBoard(svg2Ref.current, player2Shots, player2StdDev, p2Coverage50, p2Coverage80);
        }
    }, [player2Shots, player2StdDev, p2Coverage50, p2Coverage80, comparisonMode]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setStdDev(val);
        logEvent('sd_change', 'DartBoard', { player: 'A', stdDev: val, skillLevel: getSkillLabel(val).label });
    };

    const handlePlayer2SliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setPlayer2StdDev(val);
        logEvent('sd_change', 'DartBoard', { player: 'B', stdDev: val, skillLevel: getSkillLabel(val).label });
    };

    useEffect(() => {
        const timer = setTimeout(() => handleShoot(stdDev, false), 50);
        return () => clearTimeout(timer);
    }, [stdDev]);

    useEffect(() => {
        if (comparisonMode) {
            const timer = setTimeout(() => handleShoot(player2StdDev, true), 50);
            return () => clearTimeout(timer);
        }
    }, [player2StdDev, comparisonMode]);

    // Toggle comparison mode
    const toggleComparisonMode = () => {
        const newMode = !comparisonMode;
        logEvent('comparison_mode', 'DartBoard', { enabled: newMode });
        setComparisonMode(newMode);
        if (newMode) {
            handleShoot(player2StdDev, true);
        }
    };

    const skillInfo = getSkillLabel(stdDev);
    const p2SkillInfo = getSkillLabel(player2StdDev);

    // --- Chat Logic ---
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining Standard Deviation (SD) using a dartboard.
            Current State:
            - SD Setting: ${stdDev} (Range: 1-50)
            - Skill Level: ${skillInfo.label}
            - 50% Coverage Radius: ${coverage50.radius.toFixed(1)}
            - 80% Coverage Radius: ${coverage80.radius.toFixed(1)}
            - Average Distance from Center: ${avgDistance.toFixed(1)}
            ${comparisonMode ? `- Comparison Mode ON: Player 2 SD=${player2StdDev}` : ''}
            
            Educational Goal:
            - SD is the average distance from the center (Mean).
            - Low SD = Consistent/Reliable. High SD = Variable/Unpredictable.
            - Real-world examples: exam scores, bus arrival times, manufacturing quality
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
                    <p className="text-slate-400 mt-2">Standard Deviation measures the "Spread" or "Consistency" of your shots.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center">

                    {/* Comparison Mode Toggle */}
                    <div className="w-full flex justify-end mb-2">
                        <button
                            onClick={toggleComparisonMode}
                            className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${comparisonMode ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            {comparisonMode ? '🔄 Compare Mode ON' : '👥 Compare Players'}
                        </button>
                    </div>

                    {/* Boards Container */}
                    <div className={`flex ${comparisonMode ? 'gap-4' : ''} justify-center w-full`}>
                        {/* Player 1 Board */}
                        <div className="flex flex-col items-center">
                            {comparisonMode && <div className="text-center mb-2 text-emerald-400 font-bold">Player A</div>}
                            <svg ref={svgRef} className={`${comparisonMode ? 'w-full max-w-[350px]' : 'w-full'} min-h-[300px]`} style={{ overflow: 'visible' }}></svg>
                        </div>

                        {/* Player 2 Board (Comparison Mode) */}
                        {comparisonMode && (
                            <div className="flex flex-col items-center">
                                <div className="text-center mb-2 text-rose-400 font-bold">Player B</div>
                                <svg ref={svg2Ref} className="w-full max-w-[350px] min-h-[300px]" style={{ overflow: 'visible' }}></svg>
                            </div>
                        )}
                    </div>

                    {/* Coverage Statistics */}
                    <div className={`w-full mt-4 grid ${comparisonMode ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        {/* Player 1 Stats */}
                        <div className="bg-slate-800 p-3 rounded-lg">
                            {comparisonMode && <div className="text-emerald-400 font-bold text-sm mb-2">Player A Stats</div>}
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-slate-700 p-2 rounded">
                                    <div className="text-green-400 font-bold">50%</div>
                                    <div className="text-slate-300">{coverage50.count}/{shots.length}</div>
                                </div>
                                <div className="bg-slate-700 p-2 rounded">
                                    <div className="text-blue-400 font-bold">80%</div>
                                    <div className="text-slate-300">{coverage80.count}/{shots.length}</div>
                                </div>
                                <div className="bg-slate-700 p-2 rounded">
                                    <div className="text-purple-400 font-bold">95%</div>
                                    <div className="text-slate-300">{coverage95.count}/{shots.length}</div>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-400 text-center">
                                Avg Distance: <span className="text-amber-400 font-mono">{avgDistance.toFixed(1)}</span>
                            </div>
                        </div>

                        {/* Player 2 Stats (Comparison Mode) */}
                        {comparisonMode && (
                            <div className="bg-slate-800 p-3 rounded-lg">
                                <div className="text-rose-400 font-bold text-sm mb-2">Player B Stats</div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-slate-700 p-2 rounded">
                                        <div className="text-green-400 font-bold">50%</div>
                                        <div className="text-slate-300">{p2Coverage50.count}/{player2Shots.length}</div>
                                    </div>
                                    <div className="bg-slate-700 p-2 rounded">
                                        <div className="text-blue-400 font-bold">80%</div>
                                        <div className="text-slate-300">{p2Coverage80.count}/{player2Shots.length}</div>
                                    </div>
                                    <div className="bg-slate-700 p-2 rounded">
                                        <div className="text-purple-400 font-bold">95%</div>
                                        <div className="text-slate-300">-</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-slate-400 text-center">
                                    Avg Distance: <span className="text-amber-400 font-mono">{p2AvgDistance.toFixed(1)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sliders */}
                    <div className={`w-full mt-6 grid ${comparisonMode ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        {/* Player 1 Slider */}
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <label className="flex justify-between text-slate-300 font-bold mb-2">
                                <span>{comparisonMode ? 'Player A' : 'SD (Spread)'}</span>
                                <span className="font-mono text-amber-400">{stdDev}</span>
                            </label>
                            <input
                                type="range" min="1" max="50" value={stdDev}
                                onChange={handleSliderChange}
                                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-2xl">{skillInfo.emoji}</span>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-200">{skillInfo.label}</div>
                                    <div className="text-xs text-slate-400">{skillInfo.example}</div>
                                </div>
                            </div>
                        </div>

                        {/* Player 2 Slider (Comparison Mode) */}
                        {comparisonMode && (
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <label className="flex justify-between text-slate-300 font-bold mb-2">
                                    <span>Player B</span>
                                    <span className="font-mono text-rose-400">{player2StdDev}</span>
                                </label>
                                <input
                                    type="range" min="1" max="50" value={player2StdDev}
                                    onChange={handlePlayer2SliderChange}
                                    className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-2xl">{p2SkillInfo.emoji}</span>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-slate-200">{p2SkillInfo.label}</div>
                                        <div className="text-xs text-slate-400">{p2SkillInfo.example}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Educational Note */}
                    <div className="w-full mt-4 bg-slate-800/50 p-3 rounded border border-slate-700 text-sm text-slate-400">
                        <strong className="text-slate-300">💡 As SD increases,</strong> points scatter further from the mean (center).
                        Coverage circles show the % of points contained within that radius.
                    </div>
                </div>

                <div className="lg:col-span-1 h-full min-h-[600px]">
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
