import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface EffectSizeMagnifierProps {
    onBack: () => void;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    group: 'A' | 'B';
}

const EffectSizeMagnifier: React.FC<EffectSizeMagnifierProps> = ({ onBack }) => {
    // State
    const [effectSize, setEffectSize] = useState(0.2); // Cohen's d (0.2 to 2.0)
    const [sampleSize, setSampleSize] = useState(20); // N per group
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ detected: boolean; pValue: number } | null>(null);

    // Particles
    const [particles, setParticles] = useState<Particle[]>([]);

    // Chat
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to the Petri Dish! 🧫 I'm Dr. Gem.", role: 'model' },
        { text: "Here, 'Effect Size' is how different the two bacteria strains look. 'Sample Size' is how many you collect.", role: 'model' },
        { text: "Try to make the difference 'Statistically Significant'!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    // Generate Particles
    useEffect(() => {
        const newParticles: Particle[] = [];
        // Group A: Centered at 30% width
        for (let i = 0; i < sampleSize; i++) {
            newParticles.push({
                id: i,
                x: 30 + (Math.random() - 0.5) * 20,
                y: 50 + (Math.random() - 0.5) * 40,
                group: 'A'
            });
        }
        // Group B: Centered at 30% + EffectSize shift
        // We map d=0 -> 0 shift, d=2 -> 40 shift
        const shift = effectSize * 20;
        for (let i = 0; i < sampleSize; i++) {
            newParticles.push({
                id: i + sampleSize,
                x: 30 + shift + (Math.random() - 0.5) * 20,
                y: 50 + (Math.random() - 0.5) * 40,
                group: 'B'
            });
        }
        setParticles(newParticles);
        setScanResult(null); // Reset result on change
    }, [effectSize, sampleSize]);

    // D3 Render
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 300;
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Petri Dish Background
        svg.append('circle')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', height / 2 - 10)
            .attr('fill', '#0f172a')
            .attr('stroke', '#334155')
            .attr('stroke-width', 4);

        // Particles
        // Mapping 0-100 coordinates to pixels
        const xScale = d3.scaleLinear().domain([0, 100]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, 100]).range([0, height]);

        svg.selectAll('circle.particle')
            .data(particles)
            .join('circle')
            .attr('class', 'particle')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 4)
            .attr('fill', d => d.group === 'A' ? '#38bdf8' : '#f472b6') // Cyan vs Pink
            .attr('opacity', 0.7);

        // Overlay Scanner Line if scanning
        if (isScanning) {
            const scanner = svg.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 0)
                .attr('y2', height)
                .attr('stroke', '#4ade80')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            scanner.transition()
                .duration(1000)
                .ease(d3.easeLinear)
                .attr('x1', width)
                .attr('x2', width)
                .remove();
        }

    }, [particles, isScanning]);

    const runScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);

            // Calculate pseudo t-test stats
            const groupA = particles.filter(p => p.group === 'A').map(p => p.x);
            const groupB = particles.filter(p => p.group === 'B').map(p => p.x);

            const meanA = d3.mean(groupA) || 0;
            const meanB = d3.mean(groupB) || 0;
            const varA = d3.variance(groupA) || 1;
            const varB = d3.variance(groupB) || 1;

            // t = (mean1 - mean2) / sqrt(var1/n1 + var2/n2)
            const pooledSE = Math.sqrt((varA / sampleSize) + (varB / sampleSize));
            const t = Math.abs(meanA - meanB) / pooledSE;

            // Rough p-value approx from t
            // t > 2 is approx significant for reasonable N
            const isSig = t > 2.0;
            const pVal = isSig ? 0.01 : 0.2; // Dummy values for display logic

            setScanResult({ detected: isSig, pValue: pVal });

            if (isSig) {
                addBotMessage(`Analysis Complete. Difference DETECTED! (t=${t.toFixed(2)}). The Effect Size or Sample Size was large enough.`);
            } else {
                addBotMessage(`Analysis Complete. Result INCONCLUSIVE (t=${t.toFixed(2)}). Try increasing the Sample Size or the Effect Size.`);
            }

        }, 1000);
    };

    const addBotMessage = (text: string) => {
        setChatHistory(prev => [...prev, { text, role: 'model' }]);
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining Power and Effect Size using a biological metaphor.
            Current State:
            - Effect Size (Contrast): ${effectSize} (Low < 0.5, High > 0.8)
            - Sample Size (Dots): ${sampleSize}
            - Last Scan Result: ${scanResult ? (scanResult.detected ? "DETECTED" : "MISSED") : "Not scanned"}
            
            Educational Goal:
            - Power depends on BOTH Effect Size (magnitude of difference) and Sample Size (data quantity).
            - Small effects need HUGE samples to be detected.
            - Large effects can be detected with small samples.
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
                <button onClick={onBack} className="text-pink-400 hover:text-pink-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-pink-400">The Effect Size Magnifier</h1>
                    <p className="text-slate-400 mt-2">Can you spot the difference? Adjust contrast (Effect Size) and resolution (Sample Size).</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Visualization */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    <div className="bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center relative">
                        <svg ref={svgRef} className="w-full h-full min-h-[300px]" style={{ overflow: 'visible' }}></svg>

                        {scanResult && (
                            <div className={`absolute top-4 right-4 px-4 py-2 rounded font-bold text-white shadow-lg ${scanResult.detected ? 'bg-green-600' : 'bg-red-600'}`}>
                                {scanResult.detected ? "DIFFERENCE DETECTED" : "INCONCLUSIVE"}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg space-y-6">
                        <div>
                            <label className="flex justify-between text-slate-300 font-bold mb-2">
                                <span>Effect Size (Contrast)</span>
                                <span className="font-mono text-pink-400">{effectSize.toFixed(2)}</span>
                            </label>
                            <input
                                type="range" min="0" max="2" step="0.1"
                                value={effectSize}
                                onChange={(e) => setEffectSize(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>Subtle Difference</span>
                                <span>Obvious Difference</span>
                            </div>
                        </div>

                        <div>
                            <label className="flex justify-between text-slate-300 font-bold mb-2">
                                <span>Sample Size (Resolution)</span>
                                <span className="font-mono text-cyan-400">n = {sampleSize}</span>
                            </label>
                            <input
                                type="range" min="5" max="200" step="5"
                                value={sampleSize}
                                onChange={(e) => setSampleSize(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <button
                            onClick={runScan}
                            disabled={isScanning}
                            className="w-full py-4 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isScanning ? "SCANNING..." : "RUN DETECTION SCANNER"}
                        </button>
                    </div>
                </div>

                {/* Right: Chatbot */}
                <div className="lg:col-span-1 h-[600px]">
                    <UnifiedGenAIChat
                        moduleTitle="Effect Size Magnifier"
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

export default EffectSizeMagnifier;
