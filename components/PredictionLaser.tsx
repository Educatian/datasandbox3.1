import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface PredictionLaserProps {
    onBack: () => void;
}

const PredictionLaser: React.FC<PredictionLaserProps> = ({ onBack }) => {
    // State
    const [inputValue, setInputValue] = useState(50); // X (0-100)
    const [correlation, setCorrelation] = useState(0.8); // r (-1 to 1)
    const [gemControlled, setGemControlled] = useState(false); // true when Dr. Gem last set r
    const [outputValue, setOutputValue] = useState(50); // Y

    // Chat
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to The Prediction Laser! 🔦 I'm Dr. Gem. Control the Correlation to steady your aim.", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    // Physics Loop for "Jitter"
    useEffect(() => {
        const interval = setInterval(() => {
            // For positive r: targetY tracks inputValue
            // For negative r: targetY goes in the OPPOSITE direction
            const targetY = correlation >= 0
                ? inputValue
                : 100 - inputValue;  // invert direction for negative correlation

            // Noise is inverse of |r|: |r|=1 → no noise, |r|=0 → max chaos
            const noiseMax = (1 - Math.abs(correlation)) * 50;
            const noise = (Math.random() - 0.5) * 2 * noiseMax;

            let nextY = targetY + noise;
            nextY = Math.max(5, Math.min(95, nextY));
            setOutputValue(nextY);
        }, 50);

        return () => clearInterval(interval);
    }, [inputValue, correlation]);

    // D3 Render
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = 600;
        const height = 300;
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const padding = 50;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const scale = d3.scaleLinear().domain([0, 100]).range([padding, width - padding]);

        // --- The Controller (Input X) ---
        // A sliding block at the bottom
        const inputXPos = scale(inputValue);

        svg.append('rect')
            .attr('x', inputXPos - 20)
            .attr('y', height - 40)
            .attr('width', 40)
            .attr('height', 20)
            .attr('fill', '#0891b2') // Cyan-600
            .attr('rx', 4);

        svg.append('text')
            .attr('x', inputXPos)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', '#22d3ee')
            .style('font-size', '12px')
            .text('INPUT (X)');

        // --- The Target Wall (Top) ---
        svg.append('line')
            .attr('x1', padding)
            .attr('y1', 40)
            .attr('x2', width - padding)
            .attr('y2', 40)
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', 4);

        // --- The Laser Beam ---
        // Originating from Input X, hitting Output Y on the wall
        const outputXPos = scale(outputValue);

        svg.append('line')
            .attr('x1', inputXPos)
            .attr('y1', height - 40)
            .attr('x2', outputXPos)
            .attr('y2', 40)
            .attr('stroke', '#ef4444') // Red laser
            .attr('stroke-width', 2)
            .attr('opacity', 0.4 + Math.abs(correlation) * 0.6); // Brighter if stronger |r|

        // --- The Laser Dot (Output Y) ---
        svg.append('circle')
            .attr('cx', outputXPos)
            .attr('cy', 40)
            .attr('r', 4 + (1 - Math.abs(correlation)) * 12) // Dot larger/fuzzier when |r| is low
            .attr('fill', correlation >= 0 ? '#ef4444' : '#f97316') // Red = positive, Orange = negative
            .attr('filter', `drop-shadow(0 0 8px ${correlation >= 0 ? 'red' : 'orange'})`);

        svg.append('text')
            .attr('x', outputXPos)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f87171')
            .style('font-size', '12px')
            .text('OUTPUT (Y)');

        // --- Visualization of Error ---
        // A "ghost" target showing where it *should* be (perfect prediction)
        if (Math.abs(correlation) < 0.95) {
            svg.append('circle')
                .attr('cx', inputXPos)
                .attr('cy', 40)
                .attr('r', 4)
                .attr('fill', 'none')
                .attr('stroke', '#0891b2')
                .attr('stroke-dasharray', '2,2')
                .attr('opacity', 0.5);

            // Error line
            svg.append('line')
                .attr('x1', inputXPos)
                .attr('y1', 40)
                .attr('x2', outputXPos)
                .attr('y2', 40)
                .attr('stroke', '#94a3b8')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2,2');
        }

    }, [inputValue, outputValue, correlation]);

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);
        setGemControlled(false);

        const context = `
            You are Dr. Gem, an educational AI explaining Correlation using a Laser Pointer metaphor.
            Current State:
            - Correlation (r): ${correlation.toFixed(2)}
              * r = +1: Perfect positive aim (X up → Y up)
              * r = 0: No relationship (pure chaos)
              * r = −1: Perfect negative aim (X up → Y DOWN)
            - Input X: ${inputValue}
            - Output Y: ${outputValue.toFixed(0)}

            Educational Goal:
            - Correlation measures BOTH strength and DIRECTION.
            - |r| close to 1 = strong relationship, tight laser beam.
            - Negative r flips the direction — when X increases, Y decreases.
            - r = 0 means knowing X tells us nothing about Y.

            IMPORTANT INSTRUCTION — SLIDER CONTROL:
            After your reply, you MAY set the correlation slider to demonstrate a concept.
            To do so, append EXACTLY this tag on a new line at the very end of your message:
            [SET_R:0.75]
            Replace 0.75 with a value between -1.00 and 1.00 (two decimal places).
            Only include this tag if it genuinely helps illustrate your point.
            If you include the tag, also mention in your reply that you are adjusting the slider for the student.
            Example: "Let me set the slider to −0.8 so you can see a strong negative correlation in action. [SET_R:-0.80]"
        `;

        try {
            const response = await getChatResponse(msg, context);

            // Parse optional [SET_R:value] directive from the AI response
            const setRMatch = response.match(/\[SET_R:(-?\d+\.?\d*)\]/);
            const cleanedResponse = response.replace(/\[SET_R:(-?\d+\.?\d*)\]/g, '').trim();

            if (setRMatch) {
                const newR = Math.max(-1, Math.min(1, parseFloat(setRMatch[1])));
                setCorrelation(newR);
                setGemControlled(true);
            }

            setChatHistory(prev => [...prev, { text: cleanedResponse, role: 'model' as const }]);
        } catch {
            setChatHistory(prev => [...prev, { text: "Connection error.", role: 'model' as const }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">The Prediction Laser</h1>
                    <p className="text-slate-400 mt-2">Correlation determines the precision of your control.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Visualization */}
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    <div className="bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-50 pointer-events-none"></div>
                        <svg ref={svgRef} className="w-full h-full min-h-[300px]" style={{ overflow: 'visible' }}></svg>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg space-y-8">
                        <div>
                            <label className="flex justify-between text-slate-300 font-bold mb-2">
                                <span>Input Control (X)</span>
                                <span className="font-mono text-cyan-400">{inputValue}</span>
                            </label>
                            <input
                                type="range" min="0" max="100"
                                value={inputValue}
                                onChange={(e) => setInputValue(parseFloat(e.target.value))}
                                className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">Move the slider to aim the laser.</p>
                        </div>

                        <div className="border-t border-slate-700 pt-6">
                            <label className="flex justify-between text-slate-300 font-bold mb-2">
                                <span className="flex items-center gap-2">
                                    Correlation Strength (r)
                                    {gemControlled && (
                                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                            🤖 Dr. Gem
                                        </span>
                                    )}
                                </span>
                                <span className="font-mono text-red-400">{correlation.toFixed(2)}</span>
                            </label>
                            <input
                                type="range" min="-1" max="1" step="0.05"
                                value={correlation}
                                onChange={(e) => { setCorrelation(parseFloat(e.target.value)); setGemControlled(false); }}
                                className={`w-full h-2 bg-gradient-to-r from-orange-500 via-slate-600 to-red-500 rounded-lg appearance-none cursor-pointer ${gemControlled ? 'accent-purple-500' : 'accent-red-500'
                                    }`}
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>−1.0 (Perfect Negative)</span>
                                <span>0.0 (No Relation)</span>
                                <span>+1.0 (Perfect Positive)</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {[
                                    { label: '🔄 Strong −', value: -0.9 },
                                    { label: '📉 Moderate −', value: -0.5 },
                                    { label: '🌪 None', value: 0 },
                                    { label: '📈 Moderate +', value: 0.5 },
                                    { label: '🎯 Strong +', value: 0.9 },
                                ].map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setCorrelation(preset.value)}
                                        className={`px-2 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${Math.abs(correlation - preset.value) < 0.1
                                            ? 'bg-red-500 border-red-400 text-white'
                                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {correlation > 0.6 ? '🎯 Strong positive — X↑ means Y↑' :
                                    correlation < -0.6 ? '🔄 Strong negative — X↑ means Y↓' :
                                        Math.abs(correlation) < 0.2 ? '🌪 Near zero — X tells us nothing about Y' :
                                            correlation > 0 ? '📈 Moderate positive relationship' :
                                                '📉 Moderate negative relationship'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Chatbot */}
                <div className="lg:col-span-1 h-[600px]">
                    <UnifiedGenAIChat
                        moduleTitle="The Prediction Laser"
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

export default PredictionLaser;
