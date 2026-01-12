import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface GodModeSwitchProps {
    onBack: () => void;
}

interface PlantData {
    id: number;
    sunlight: number;
    temperature: number;
    growth: number;
    mode: 'observational' | 'experimental';
}

const GodModeSwitch: React.FC<GodModeSwitchProps> = ({ onBack }) => {
    const [mode, setMode] = useState<'observational' | 'experimental'>('observational');
    const [data, setData] = useState<PlantData[]>([]);
    const [sunlightInput, setSunlightInput] = useState(50);
    const [currentWeather, setCurrentWeather] = useState({ sun: 50, temp: 50 });
    const [isRecording, setIsRecording] = useState(false);

    // Chat State using shared type
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { text: "Welcome to the Causality Lab! 🌿 I'm Dr. Gem.", role: 'model' },
        { text: "Right now we are in Observational Mode. Notice how Temperature and Sunlight move together? That's a Confounding Variable.", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // --- Simulation Logic ---
    const generateWeather = () => {
        const sun = Math.random() * 80 + 10;
        const temp = sun * 0.8 + 10 + (Math.random() - 0.5) * 15;
        return { sun, temp };
    };

    const calculateGrowth = (sun: number, temp: number) => {
        let growth = (0.5 * sun) + (0.3 * temp) + (Math.random() - 0.5) * 10;
        return Math.max(5, Math.min(95, growth));
    };

    useEffect(() => {
        if (mode === 'experimental') return;
        const interval = setInterval(() => {
            if (!isRecording) {
                setCurrentWeather(generateWeather());
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [mode, isRecording]);

    const handleRecord = () => {
        setIsRecording(true);
        let sun, temp;
        if (mode === 'observational') {
            sun = currentWeather.sun;
            temp = currentWeather.temp;
        } else {
            sun = sunlightInput;
            temp = 25;
        }
        const growth = calculateGrowth(sun, temp);

        setTimeout(() => {
            const newPoint: PlantData = {
                id: Date.now(),
                sunlight: sun,
                temperature: temp,
                growth: growth,
                mode: mode
            };
            setData(prev => [...prev, newPoint]);
            setIsRecording(false);
        }, 500);
    };

    const handleReset = () => {
        setData([]);
        addBotMessage("Data cleared. Ready for a new experiment.");
    };

    const addBotMessage = (text: string) => {
        setChatHistory(prev => [...prev, { text, role: 'model' }]);
    };

    useEffect(() => {
        if (mode === 'experimental') {
            addBotMessage("⚡ **GOD MODE ACTIVATED** — You now control Sunlight directly.\n\n🔒 **Temperature is fixed at 25°C** (controlled variable).\n\nThis isolates the independent variable so you can prove causality!");
        } else {
            addBotMessage("📷 **OBSERVATIONAL MODE** — We are passive observers.\n\n⚠️ **Sunlight AND Temperature vary together** (confounding variables).\n\nNotice how it's harder to tell what's really causing plant growth?");
        }
    }, [mode]);

    useEffect(() => {
        if (data.length === 0) return;
        if (data.length === 1) addBotMessage("First data point recorded. Collect more to see the trend.");
        else if (data.length === 5) addBotMessage("Good sample size building up. Do you see a pattern forming?");
        else if (data.length === 10 && mode === 'observational') addBotMessage("Notice the messiness? In Observational mode, it's hard to get a clean line.");
        else if (data.length === 10 && mode === 'experimental') addBotMessage("Look at that clean line! You successfully isolated the variable.");
    }, [data.length, mode]);

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);
        setIsChatLoading(true);

        const lower = msg.toLowerCase();

        if (lower.includes('reset') || lower.includes('clear')) {
            handleReset();
            setIsChatLoading(false);
            return;
        }

        if (lower === 'switch' || lower === 'mode' || lower.includes('change mode')) {
            setMode(prev => prev === 'observational' ? 'experimental' : 'observational');
            setIsChatLoading(false);
            return;
        }

        const context = `
            You are Dr. Gem, an enthusiastic statistics professor.
            Current Context: Comparing Observational vs. Experimental Studies.
            State: ${mode.toUpperCase()} mode, ${data.length} data points.
            
            Educational Concepts:
            - Observational: Confounding variables (Sun & Temp move together).
            - Experimental: Controlled variables (Temp fixed). Proves causality.
            
            Keep answers brief and relevant to the simulation.
        `;

        try {
            const response = await getChatResponse(msg, context);
            addBotMessage(response);
        } catch (error) {
            addBotMessage("My radio link is fuzzy... try asking again.");
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-amber-400 hover:text-amber-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-amber-400">The God Mode Switch</h1>
                    <p className="text-slate-400 mt-2">Observational Studies (Passive) vs. Experimental Studies (Active).</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: The Simulation */}
                <div className="flex flex-col space-y-6">
                    <div className="bg-slate-800 p-2 rounded-xl flex shadow-lg border border-slate-700">
                        <button onClick={() => setMode('observational')} className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${mode === 'observational' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700'}`}>📷 Observational</button>
                        <button onClick={() => setMode('experimental')} className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${mode === 'experimental' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-700'}`}>🧪 God Mode</button>
                    </div>

                    <div className="relative h-80 w-full bg-slate-900 rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl group">
                        <div className={`absolute inset-0 transition-opacity duration-700 ${mode === 'observational' ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="absolute inset-0 bg-gradient-to-b from-sky-900 to-sky-950"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-emerald-900/50"></div>
                            <div className="absolute w-24 h-24 bg-yellow-400 rounded-full blur-md transition-all duration-1000 ease-in-out shadow-[0_0_50px_rgba(250,204,21,0.6)]" style={{ top: '10%', left: `${currentWeather.sun}%`, opacity: currentWeather.sun / 100 + 0.2 }}></div>
                        </div>

                        <div className={`absolute inset-0 transition-opacity duration-700 ${mode === 'experimental' ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="absolute inset-0 bg-slate-950"></div>
                            <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-4 bg-slate-700 rounded-b-xl flex justify-center">
                                <div className="absolute top-4 w-full h-64 bg-purple-500/20 blur-3xl transition-all duration-300" style={{ opacity: sunlightInput / 100 }}></div>
                                <div className="w-3/4 h-2 bg-purple-400 mt-1 rounded-full shadow-[0_0_20px_rgba(192,132,252,0.8)]" style={{ opacity: sunlightInput / 100 }}></div>
                            </div>
                        </div>

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-8 items-end">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`w-4 bg-green-500 rounded-t-full transition-all duration-500 ease-out ${isRecording ? 'animate-pulse' : ''}`}
                                    style={{ height: isRecording ? '10px' : `${mode === 'observational' ? calculateGrowth(currentWeather.sun, currentWeather.temp) * 2 : calculateGrowth(sunlightInput, 25) * 2}px`, opacity: isRecording ? 0.5 : 1 }}>
                                    <div className="w-8 h-8 bg-green-500 rounded-full -translate-x-2 -translate-y-4 opacity-80"></div>
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs font-mono w-40">
                                <div className="flex justify-between mb-1"><span className="text-yellow-400">Sunlight</span><span>{mode === 'observational' ? currentWeather.sun.toFixed(0) : sunlightInput.toFixed(0)}%</span></div>
                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${mode === 'observational' ? currentWeather.sun : sunlightInput}%` }}></div></div>
                            </div>
                            <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/10 text-xs font-mono w-40">
                                <div className="flex justify-between mb-1"><span className={mode === 'observational' ? 'text-red-400' : 'text-blue-400'}>Temp {mode === 'experimental' && '🔒'}</span><span>{mode === 'observational' ? currentWeather.temp.toFixed(0) : '25'}°C</span></div>
                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${mode === 'observational' ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${mode === 'observational' ? currentWeather.temp : 25}%` }}></div></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                        {mode === 'experimental' ? (
                            <div className="mb-6">
                                <label className="flex justify-between text-sm text-cyan-400 font-bold mb-2"><span>Manipulate Variable: Sunlight</span><span>{sunlightInput}%</span></label>
                                <input type="range" min="0" max="100" value={sunlightInput} onChange={(e) => setSunlightInput(+e.target.value)} className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                            </div>
                        ) : (
                            <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg"><p className="text-amber-200 text-sm flex items-center gap-2"><span>🚫</span><span>Variable manipulation locked.</span></p></div>
                        )}
                        <button onClick={handleRecord} disabled={isRecording} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 ${isRecording ? 'bg-slate-600 cursor-not-allowed' : mode === 'experimental' ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>{isRecording ? 'Measuring...' : mode === 'experimental' ? 'Run Experiment & Record' : 'Observe & Record Day'}</button>
                    </div>
                </div>

                {/* Right Column: Data & Analysis & Chat */}
                <div className="flex flex-col space-y-6">
                    <div className="bg-slate-800 rounded-xl shadow-xl p-4 flex-grow flex flex-col h-[300px]">
                        <h3 className="text-lg font-bold text-slate-300 mb-4 text-center">Data: Sunlight vs. Plant Height</h3>
                        <div className="flex-grow relative bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                            <GodModeScatterPlot data={data} />
                        </div>
                    </div>

                    {/* Unified Chat Interface - constrained height with internal scroll */}
                    {/* Unified Chat Interface - fixed height matched to container */}
                    <div className="rounded-xl bg-slate-800 mb-4 h-[320px]">
                        <UnifiedGenAIChat
                            moduleTitle="God Mode Switch"
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

// Simple D3 Scatter Plot Sub-component
const GodModeScatterPlot: React.FC<{ data: PlantData[] }> = ({ data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        svg.selectAll('*').remove();

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5).tickFormat(() => '')).selectAll('line').attr('stroke', '#334155');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(() => '')).selectAll('line').attr('stroke', '#334155');
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5)).attr('color', '#94a3b8');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5)).attr('color', '#94a3b8');

        svg.append('text').attr('x', width / 2).attr('y', height - 5).attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '10px').text('Sunlight (%)');
        svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', 15).attr('text-anchor', 'middle').attr('fill', '#64748b').attr('font-size', '10px').text('Plant Height (cm)');

        svg.selectAll('circle').data(data).join('circle').attr('cx', d => x(d.sunlight)).attr('cy', d => y(d.growth)).attr('r', 5).attr('fill', d => d.mode === 'observational' ? '#f59e0b' : '#06b6d4').attr('fill-opacity', 0.7).attr('stroke', '#1e293b').attr('stroke-width', 1);
    }, [data]);

    return <svg ref={svgRef} className="w-full h-full" />;
};

export default GodModeSwitch;
