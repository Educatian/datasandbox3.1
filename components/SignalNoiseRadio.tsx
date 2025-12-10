
import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import AITutor, { ChatMessage } from './AITutor';

interface SignalNoiseRadioProps {
    onBack: () => void;
}

const SignalNoiseRadio: React.FC<SignalNoiseRadioProps> = ({ onBack }) => {
    // Parameters
    const [signal, setSignal] = useState(20); // Mean Difference (Numerator)
    const [noise, setNoise] = useState(10);   // Standard Error (Denominator)
    
    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Welcome to The Signal Radio! 📻", sender: 'bot' },
        { text: "The t-statistic is just a Signal-to-Noise ratio. Turn up the Signal or turn down the Noise to get a clear reception (Significant Result).", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const svgRef = useRef<SVGSVGElement | null>(null);

    // Derived Statistics
    const tValue = signal / (noise || 0.1); // Avoid div by zero
    // Simple critical value check (approx t_crit for df=30 is ~2.04)
    const isSignificant = Math.abs(tValue) > 2.0;

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 600;
        const height = 300;
        const svg = d3.select(svgRef.current);
        
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Background (Oscilloscope grid)
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#0f172a');
        
        // Grid lines
        const gridGroup = svg.append('g').attr('stroke', '#1e293b').attr('stroke-width', 1);
        for(let x=0; x<width; x+=40) gridGroup.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', height);
        for(let y=0; y<height; y+=40) gridGroup.append('line').attr('x1', 0).attr('x2', width).attr('y1', y).attr('y2', y);

        // Generate Wave Data
        // Signal = Amplitude of Sine
        // Noise = Random vertical jitter
        const points = [];
        const frequency = 0.05;
        
        for (let x = 0; x < width; x+=2) {
            // Base Signal (The "Truth")
            const sineY = Math.sin(x * frequency) * signal;
            
            // Noise (The "Error")
            const randomY = (Math.random() - 0.5) * noise * 5; 
            
            points.push([x, height/2 + sineY + randomY]);
        }

        const line = d3.line().curve(d3.curveMonotoneX);

        // Draw Wave
        svg.append('path')
            .datum(points as [number, number][])
            .attr('fill', 'none')
            .attr('stroke', isSignificant ? '#4ade80' : '#ef4444') // Green if sig, Red if not
            .attr('stroke-width', 2)
            .attr('d', line)
            .attr('filter', 'drop-shadow(0 0 5px rgba(255,255,255,0.5))');

        // Draw "True" Signal (Ghost line)
        const truePoints = [];
        for (let x = 0; x < width; x+=2) {
            truePoints.push([x, height/2 + Math.sin(x * frequency) * signal]);
        }
        
        svg.append('path')
            .datum(truePoints as [number, number][])
            .attr('fill', 'none')
            .attr('stroke', 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5,5')
            .attr('d', line);

    }, [signal, noise, tValue, isSignificant]);

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);
        setIsChatLoading(true);

        const context = `
            You are Dr. Gem, explaining the t-statistic using a Radio Signal metaphor.
            Current State:
            - Signal (Mean Difference): ${signal}
            - Noise (Standard Error): ${noise}
            - t-value: ${tValue.toFixed(2)}
            - Significant? ${isSignificant ? "YES (Clear Audio)" : "NO (Too much static)"}
            
            Educational Goal:
            - t = Signal / Noise.
            - To get a high t, you need BIG difference or SMALL error.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch {
            setChatHistory(prev => [...prev, { text: "Connection error.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">The Signal-to-Noise Radio</h1>
                    <p className="text-slate-400 mt-2">Understanding the t-statistic as a ratio.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 flex flex-col space-y-6">
                    {/* Oscilloscope */}
                    <div className="bg-black rounded-xl border-8 border-slate-700 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-4 left-4 text-green-500 font-mono text-xs animate-pulse">OSCILLOSCOPE ACTIVE</div>
                        <svg ref={svgRef} className="w-full h-full min-h-[300px]"></svg>
                    </div>

                    {/* Controls (Radio Knobs style) */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 grid grid-cols-2 gap-8">
                        <div>
                            <label className="block text-cyan-400 font-bold mb-2 uppercase tracking-wider">Signal Strength (Mean Diff)</label>
                            <input 
                                type="range" 
                                min="0" max="100" 
                                value={signal} 
                                onChange={(e) => setSignal(parseInt(e.target.value))} 
                                className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <div className="text-right font-mono text-slate-400 mt-1">{signal} units</div>
                        </div>
                        <div>
                            <label className="block text-rose-400 font-bold mb-2 uppercase tracking-wider">Static Noise (Std Error)</label>
                            <input 
                                type="range" 
                                min="5" max="100" 
                                value={noise} 
                                onChange={(e) => setNoise(parseInt(e.target.value))} 
                                className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <div className="text-right font-mono text-slate-400 mt-1">{noise} units</div>
                        </div>
                    </div>

                    {/* The Meter */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div className="text-slate-400 font-mono text-sm">
                            FORMULA: <span className="text-cyan-400">Signal</span> / <span className="text-rose-400">Noise</span> = <span className="text-white font-bold">t</span>
                        </div>
                        <div className={`text-4xl font-black font-mono ${isSignificant ? 'text-green-400 animate-pulse' : 'text-slate-600'}`}>
                            t = {tValue.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Chatbot */}
                <div className="lg:col-span-1 h-[600px]">
                    <AITutor 
                        history={chatHistory}
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        className="h-full"
                        suggestedActions={[
                            { label: "What is t-value?", action: () => handleSendMessage("What does the t-value represent?") },
                            { label: "How to increase t?", action: () => handleSendMessage("How can I get a higher t-value?") },
                        ]}
                    />
                </div>
            </main>
        </div>
    );
};

export default SignalNoiseRadio;
