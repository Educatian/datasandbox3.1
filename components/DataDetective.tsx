
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import { calculateCorrelation, calculateLinearRegression } from '../services/statisticsService';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface DataDetectiveProps {
    onBack: () => void;
}

const ORIGINAL_DATASETS = {
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

const DATASET_LABELS: Record<DatasetKey, string> = {
    I: 'Linear',
    II: 'Curved',
    III: 'Outlier-Driven',
    IV: 'Leverage Point'
};

const DATASET_EXPLANATIONS: Record<DatasetKey, { short: string; detail: string; isTarget: boolean }> = {
    I: {
        short: '✅ Normal linear relationship',
        detail: 'The gold standard. Statistics (r=0.816) and visualization suggest the same linear relationship. In this case, your eyes and the math are in perfect agreement.',
        isTarget: false
    },
    II: {
        short: '🎯 Curved relationship hidden by linear stats!',
        detail: 'Statistical camouflage. While r=0.816 suggests a line, the eyes see a perfect shoe-shaped curve. This teaches that correlation only measures LINEAR strength; it is blind to beautiful non-linear patterns.',
        isTarget: true
    },
    III: {
        short: '⚠️ The Outlier Trap (Leverage)',
        detail: 'A single point (13, 12.7) pulls the regression line away from the otherwise perfect linear cluster. Correlation is highly sensitive to extreme values—this one "outlier" forces the line to tilt, distorting the truth for all other points.',
        isTarget: false
    },
    IV: {
        short: '🚨 The Leverage Phantom',
        detail: 'Historically, all points here are clustered at x=8 (vertical line, zero trend). A single remote point at x=19 manufactures a "fake" correlation of 0.816 out of thin air. This is the danger of high-leverage points in small samples.',
        isTarget: false
    }
};

const DataDetective: React.FC<DataDetectiveProps> = ({ onBack }) => {
    // Game State
    const [datasets, setDatasets] = useState<Record<DatasetKey, { x: number, y: number }[]>>(() => {
        // Deep copy
        return JSON.parse(JSON.stringify(ORIGINAL_DATASETS));
    });
    const [selectedSet, setSelectedSet] = useState<DatasetKey | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);

    // Chat State
    const [chatHistory, setChatHistory] = useState<Message[]>([
        {
            text: "Welcome to 'The Data Detective' (Interactive Edition)! 🕵️‍♂️ All 4 suspects are in the lineup. They share identical stats, but one is an IMPOSTER (curved). \n\n**NEW:** You can now DRAG any point to see how the statistics 'feel' their influence!",
            role: 'model'
        }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handlePointUpdate = (set: DatasetKey, index: number, newX: number, newY: number) => {
        setDatasets(prev => {
            const newSet = [...prev[set]];
            newSet[index] = { x: newX, y: newY };
            return { ...prev, [set]: newSet };
        });
    };

    const handleCardClick = (set: DatasetKey) => {
        if (isCorrect) {
            setSelectedSet(set);
            return;
        }

        setSelectedSet(set);
        const explanation = DATASET_EXPLANATIONS[set];

        if (set === 'II') {
            setIsCorrect(true);
            setChatHistory(prev => [...prev,
            { role: 'user', text: `I think Suspect ${set} is the imposter!` },
            { role: 'model', text: `🎉 **CORRECT!** ${explanation.detail}\n\n**Hands-on challenge:** Try dragging the points in the linear sets to see how much you can change the correlation just by moving one outlier!` }
            ]);
        } else {
            setChatHistory(prev => [...prev,
            { role: 'user', text: `Is Suspect ${set} the imposter?` },
            { role: 'model', text: `Not the imposter, but keep looking! **${DATASET_LABELS[set]}**: ${explanation.detail}` }
            ]);
        }
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            Game: The Data Detective (Anscombe's Quartet).
            Interactive Mode: Points are DRAGGABLE.
            Target: Quadratic Curve (Dataset II).
            
            Current Live Stats for selected ${selectedSet || 'none'}:
            ${selectedSet ? `r = ${calculateCorrelation(datasets[selectedSet].map((p, i) => ({ id: i, ...p }))).toFixed(3)}` : 'N/A'}
            
            Key Concept: All initially share Mean X (9.0), Mean Y (7.5), Correlation (0.816).
            If user moves points, they are exploring sensitivity analysis and influence.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the evidence.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedSet, datasets]);

    const handleReset = () => {
        setDatasets(JSON.parse(JSON.stringify(ORIGINAL_DATASETS)));
        setSelectedSet(null);
        setIsCorrect(false);
        setChatHistory([{
            text: "Reset to the original quartet. All stats are identical again. 🕵️‍♂️",
            role: 'model'
        }]);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-2 inline-block transition-colors">&larr; Back to Portal</button>
                    <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">The Data Detective 🕵️‍♂️</h1>
                    <p className="text-slate-400 mt-2 text-lg">Case File: Interactive Anscombe — Feel the Influence</p>
                </div>
                <button
                    onClick={handleReset}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-full transition-all border border-slate-600 flex items-center gap-2"
                >
                    <span className="text-lg" aria-hidden="true">🔄</span> Reset Quartet
                </button>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: The Lineup */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Suspect Profile (Live Stats for selected) */}
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-slate-300 mb-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="bg-slate-700 p-2 rounded mr-3">🕵️‍♂️</span>
                                {selectedSet ? `Inspecting Suspect ${selectedSet}` : "Select a card to inspect stats"}
                            </div>
                            {selectedSet && <span className="text-sm font-normal text-slate-500 italic">{DATASET_LABELS[selectedSet]}</span>}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {selectedSet ? (
                                <LiveStatBoxes data={datasets[selectedSet]} />
                            ) : (
                                <div className="col-span-4 text-center py-4 text-slate-500 italic">Click a suspect card to see live statistical feedback</div>
                            )}
                        </div>
                    </div>

                    {/* The Cards — All Visible & Draggable */}
                    <div className="grid grid-cols-2 gap-6">
                        {(['I', 'II', 'III', 'IV'] as const).map(set => (
                            <InteractiveDatasetCard
                                key={set}
                                datasetKey={set}
                                data={datasets[set]}
                                originalData={ORIGINAL_DATASETS[set]}
                                isSelected={selectedSet === set}
                                onPointUpdate={(idx, nx, ny) => handlePointUpdate(set, idx, nx, ny)}
                                onClick={() => handleCardClick(set)}
                                isCorrectAnswer={set === 'II'}
                                gameWon={isCorrect}
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
                                        Explaining Suspect {selectedSet}
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

const LiveStatBoxes = ({ data }: { data: { x: number, y: number }[] }) => {
    const points = useMemo(() => data.map((p, i) => ({ id: i, ...p })), [data]);
    const r = calculateCorrelation(points);
    const line = calculateLinearRegression(points);
    const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
    const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;

    return (
        <>
            <StatBox label="Mean X" value={meanX.toFixed(1)} color="text-green-400" />
            <StatBox label="Mean Y" value={meanY.toFixed(2)} color="text-green-400" />
            <StatBox label="Correlation (r)" value={r.toFixed(3)} color="text-yellow-400" />
            <StatBox label="Regression" value={`y = ${line.slope.toFixed(2)}x + ${line.intercept.toFixed(1)}`} color="text-yellow-400" />
        </>
    );
};

const StatBox = ({ label, value, color }: { label: string, value: string, color: string }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700/50 text-center">
        <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
    </div>
);

interface InteractiveDatasetCardProps {
    datasetKey: DatasetKey;
    data: { x: number, y: number }[];
    originalData: { x: number, y: number }[];
    isSelected: boolean;
    onPointUpdate: (idx: number, nx: number, ny: number) => void;
    onClick: () => void;
    isCorrectAnswer: boolean;
    gameWon: boolean;
}

const InteractiveDatasetCard: React.FC<InteractiveDatasetCardProps> = ({ datasetKey, data, originalData, isSelected, onPointUpdate, onClick, isCorrectAnswer, gameWon }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const updateRef = useRef(onPointUpdate);
    updateRef.current = onPointUpdate;

    // Use refs to store D3 selections and scales to avoid recreation
    const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
    const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
    const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);

    // Initial setup of SVG structure
    useEffect(() => {
        if (!svgRef.current) return;

        const width = 300;
        const height = 200;
        const margin = { top: 10, right: 10, bottom: 25, left: 35 };

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const g = svg.append('g');
        gRef.current = g;

        // Scales
        const x = d3.scaleLinear().domain([0, 20]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 15]).range([height - margin.bottom, margin.top]);
        xScaleRef.current = x;
        yScaleRef.current = y;

        // Draw Axes
        const xAxis = d3.axisBottom(x).ticks(5).tickSizeOuter(0);
        const yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0);

        g.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(xAxis)
            .attr('color', '#475569')
            .selectAll('text').attr('font-size', '8');

        g.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(yAxis)
            .attr('color', '#475569')
            .selectAll('text').attr('font-size', '8');

        // Draw Ghost elements (static)
        const ghostPoints = originalData.map((p, i) => ({ id: i, ...p }));
        const ghostLine = calculateLinearRegression(ghostPoints);

        g.append('line')
            .attr('x1', x(0))
            .attr('y1', y(ghostLine.slope * 0 + ghostLine.intercept))
            .attr('x2', x(20))
            .attr('y2', y(ghostLine.slope * 20 + ghostLine.intercept))
            .attr('stroke', 'rgba(148, 163, 184, 0.15)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '2,2');

        g.selectAll('.ghost-circle')
            .data(originalData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 2)
            .attr('fill', 'rgba(148, 163, 184, 0.2)');

        // Prepare line and point groups
        g.append('line').attr('class', 'regression-line');
        g.append('g').attr('class', 'points-group');

    }, [originalData]); // Only re-setup if originalData changes (e.g. module reload)

    // Dynamic Updates (Persistent elements)
    useEffect(() => {
        if (!gRef.current || !xScaleRef.current || !yScaleRef.current) return;

        const g = gRef.current;
        const x = xScaleRef.current;
        const y = yScaleRef.current;

        // Update Line
        const currentPoints = data.map((p, i) => ({ id: i, ...p }));
        const currentLine = calculateLinearRegression(currentPoints);

        g.select('.regression-line')
            .attr('x1', x(0))
            .attr('y1', y(currentLine.slope * 0 + currentLine.intercept))
            .attr('x2', x(20))
            .attr('y2', y(currentLine.slope * 20 + currentLine.intercept))
            .attr('stroke', isSelected ? '#22d3ee' : '#cbd5e1')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);

        // Update Points with stable drag
        const drag = d3.drag<SVGCircleElement, any>()
            .on('start', function () {
                d3.select(this).raise().attr('r', 8).attr('stroke', 'white');
            })
            .on('drag', function (event, d) {
                // event.x/y in d3-drag is relative to the container if we are dragging the subject
                // To be absolute stable, we use d3.pointer relative to the SVG container
                const [mouseX, mouseY] = d3.pointer(event, svgRef.current);
                const nx = Math.max(0, Math.min(20, x.invert(mouseX)));
                const ny = Math.max(0, Math.min(15, y.invert(mouseY)));

                // Visual immediate feedback (no waiting for React)
                d3.select(this).attr('cx', x(nx)).attr('cy', y(ny));

                // Parent state update
                const idx = data.indexOf(d);
                if (idx !== -1) {
                    updateRef.current(idx, nx, ny);
                }
            })
            .on('end', function () {
                d3.select(this).attr('r', 5).attr('stroke', '#0f172a');
            });

        g.select('.points-group')
            .selectAll<SVGCircleElement, { x: number, y: number }>('.data-circle')
            .data(data)
            .join('circle')
            .attr('class', 'data-circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 5)
            .attr('fill', d => {
                if (datasetKey === 'III' && d.x > 12) return '#f87171'; // Outlier
                if (datasetKey === 'IV' && d.x > 10) return '#f87171'; // Leverage
                return '#22d3ee';
            })
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1)
            .style('cursor', 'crosshair')
            .call(drag as any);

    }, [data, isSelected, datasetKey]); // data changes frequently, but we don't clear the SVG

    const borderClass = isSelected
        ? isCorrectAnswer && gameWon
            ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
        : 'border-slate-700 hover:border-slate-500';

    return (
        <div
            onClick={(e) => {
                if ((e.target as HTMLElement).tagName !== 'circle') {
                    onClick();
                }
            }}
            className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden bg-slate-800 h-56 ${borderClass} cursor-pointer`}
        >
            <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-cyan-900/80 text-cyan-300' : 'bg-slate-700 text-slate-400'
                    }`}>
                    Suspect {datasetKey}
                </span>
                {isSelected && (
                    <span className="text-[10px] text-cyan-500 animate-pulse font-mono tracking-tighter uppercase">Live Tracking</span>
                )}
            </div>

            <div className="flex h-full">
                <div className="w-full">
                    <svg ref={svgRef} className="w-full h-full" viewBox="0 0 300 200"></svg>
                </div>
            </div>

            {isSelected && (
                <div className="absolute bottom-2 right-3 pointer-events-none">
                    <div className="text-[10px] text-slate-500 italic bg-slate-900/80 px-2 py-0.5 rounded">Drag points to sense influence</div>
                </div>
            )}
        </div>
    );
};

export default DataDetective;

