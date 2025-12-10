
import React, { useState, useEffect, useRef } from 'react';
import { getChatResponse } from '../services/geminiService';
import AITutor, { ChatMessage } from './AITutor';

interface SummationMachineProps {
    onBack: () => void;
}

interface DataOrb {
    id: number;
    value: number;
}

const SummationMachine: React.FC<SummationMachineProps> = ({ onBack }) => {
    // --- State ---
    const [data, setData] = useState<DataOrb[]>([
        { id: 1, value: 3 },
        { id: 2, value: 7 },
        { id: 3, value: 2 },
        { id: 4, value: 5 },
        { id: 5, value: 9 }
    ]);
    const [startI, setStartI] = useState(1);
    const [endN, setEndN] = useState(4);
    const [result, setResult] = useState<number | null>(null);
    
    // Animation State
    const [isCrunching, setIsCrunching] = useState(false);
    const [flyingOrbs, setFlyingOrbs] = useState<number[]>([]); 

    // Chat State using shared type
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "OPERATIONAL. I am Dr. Gem, scanning the summation machine.", sender: 'bot' },
        { text: "Adjust the belt data or the Sigma limits (i and n). Press CRUNCH to calculate.", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // --- Logic ---

    const handleAddOrb = () => {
        const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
        setData([...data, { id: newId, value: Math.floor(Math.random() * 10) + 1 }]);
    };

    const handleRemoveOrb = (id: number) => {
        setData(data.filter(d => d.id !== id));
        if (startI > data.length - 1) setStartI(Math.max(1, data.length - 1));
        if (endN > data.length - 1) setEndN(Math.max(1, data.length - 1));
    };

    const handleValueChange = (id: number, newValue: string) => {
        const val = parseInt(newValue, 10);
        if (!isNaN(val)) {
            setData(data.map(d => d.id === id ? { ...d, value: val } : d));
        }
    };

    const addBotMessage = (text: string) => {
        setChatHistory(prev => [...prev, { text, sender: 'bot' }]);
    };

    const runSimulation = () => {
        if (isCrunching) return;
        setIsCrunching(true);
        setResult(null);

        const indicesToSum = [];
        for (let i = startI; i <= endN; i++) {
            if (i <= data.length && i >= 1) indicesToSum.push(i - 1);
        }
        
        setFlyingOrbs(indicesToSum);

        setTimeout(() => {
            const sum = indicesToSum.reduce((acc, idx) => acc + data[idx].value, 0);
            setResult(sum);
            setIsCrunching(false);
            setFlyingOrbs([]);
            
            if (indicesToSum.length === 0) {
                addBotMessage(`Error: Range i=${startI} to n=${endN} is invalid or empty.`);
            } else {
                addBotMessage(`Processing complete. The sum from index ${startI} to ${endN} is ${sum}.`);
            }
        }, 1500);
    };

    // --- Chatbot ---

    const processCommand = (cmd: string): string | null => {
        const lower = cmd.toLowerCase();
        
        if (lower.startsWith('data')) {
            const numbers = lower.replace('data', '').trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
            if (numbers.length > 0) {
                const newData = numbers.map((val, idx) => ({ id: idx + 1, value: val }));
                setData(newData);
                return `Conveyor belt updated with ${newData.length} units.`;
            }
            return "Format error. Use: data [number] [number] ...";
        }

        if (lower.startsWith('range')) {
            const parts = lower.replace('range', '').trim().split(/\s+/).map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setStartI(parts[0]);
                setEndN(parts[1]);
                return `Sigma machine calibrated. Lower limit: ${parts[0]}, Upper limit: ${parts[1]}.`;
            }
            return "Format error. Use: range [start] [end]";
        }

        return null;
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);
        setIsChatLoading(true);

        const localResponse = processCommand(msg);
        if (localResponse) {
            setTimeout(() => {
                addBotMessage(localResponse);
                setIsChatLoading(false);
            }, 500);
            return;
        }

        const context = `
            You are Dr. Gem, managing a Summation Machine.
            Current State:
            - Data Belt: [${data.map(d => d.value).join(', ')}]
            - Lower Limit (i): ${startI}
            - Upper Limit (n): ${endN}
            - Last Result: ${result !== null ? result : 'Pending'}
            
            Educational Goal: Teach Sigma notation (Summation).
            - Xi is the value at position i.
            
            Persona: Robotic but friendly foreman.
        `;

        try {
            const response = await getChatResponse(msg, context);
            addBotMessage(response);
        } catch (error) {
            addBotMessage("Communication error. Re-aligning antenna...");
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-400">The Summation Machine</h1>
                    <p className="text-slate-400 mt-2">Visualizing the Sigma ($\sum$) operator as a data processing factory.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT: Factory Floor */}
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
                    
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b),linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%,#1e293b)] [background-size:20px_20px] [background-position:0_0,10px_10px]"></div>

                    {/* 1. The Machine (Center) */}
                    <div className="relative z-10 flex-grow flex flex-col items-center justify-center pt-10">
                        <div className="flex items-center space-x-2 mb-2 bg-slate-800 p-2 rounded-lg border border-indigo-500/50">
                            <span className="text-indigo-300 font-mono">n =</span>
                            <input type="number" value={endN} onChange={(e) => setEndN(parseInt(e.target.value) || 0)} className="w-16 bg-slate-900 border border-slate-700 rounded text-center text-white font-bold" />
                        </div>

                        <div className={`relative w-48 h-48 bg-slate-800 rounded-3xl border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.2)] flex items-center justify-center transition-transform duration-100 ${isCrunching ? 'animate-shake' : ''}`}>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-16 bg-slate-700 [clip-path:polygon(0%_0%,100%_0%,80%_100%,20%_100%)]"></div>
                            <div className="text-9xl font-black text-indigo-500 select-none">Σ</div>
                            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isCrunching ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                        </div>

                        <div className="flex items-center space-x-2 mt-2 bg-slate-800 p-2 rounded-lg border border-indigo-500/50">
                            <span className="text-indigo-300 font-mono">i =</span>
                            <input type="number" value={startI} onChange={(e) => setStartI(parseInt(e.target.value) || 0)} className="w-16 bg-slate-900 border border-slate-700 rounded text-center text-white font-bold" />
                        </div>

                        <div className="mt-8 h-24 w-32 bg-slate-800 border-x-2 border-slate-700 relative flex items-end justify-center pb-2">
                            {result !== null && !isCrunching && (
                                <div className="animate-drop-in bg-green-500 text-white font-bold text-2xl px-6 py-3 rounded shadow-lg">{result}</div>
                            )}
                        </div>
                    </div>

                    {/* 2. The Conveyor Belt (Bottom) */}
                    <div className="relative z-20 bg-slate-800 border-t-4 border-slate-700 p-6">
                        <div className="flex items-center space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                            {data.map((orb, index) => {
                                const isSelected = index + 1 >= startI && index + 1 <= endN;
                                const isFlying = flyingOrbs.includes(index);
                                return (
                                    <div key={orb.id} className="relative group flex-shrink-0">
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-500">i={index + 1}</div>
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-lg border-2 transition-all duration-500 ${isFlying ? 'opacity-0 translate-y-[-200px] scale-50' : 'opacity-100'} ${isSelected ? 'bg-indigo-600 border-indigo-300 text-white ring-2 ring-indigo-500/50' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                                            <input className="bg-transparent w-full text-center outline-none" value={orb.value} onChange={(e) => handleValueChange(orb.id, e.target.value)} />
                                        </div>
                                        <button onClick={() => handleRemoveOrb(orb.id)} className="absolute -bottom-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                        {isFlying && (
                                            <div className="fixed z-50 w-12 h-12 bg-indigo-400 rounded-full flex items-center justify-center text-white font-bold animate-suck-in pointer-events-none" style={{ left: `calc(50% + ${(index - (data.length-1)/2) * 60}px)` }}>{orb.value}</div>
                                        )}
                                    </div>
                                );
                            })}
                            <button onClick={handleAddOrb} className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-400 transition-colors">+</button>
                        </div>
                        <div className="h-4 bg-black mt-2 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-[linear-gradient(90deg,transparent_50%,#334155_50%)] [background-size:20px_100%] animate-conveyor"></div>
                        </div>
                    </div>

                    <button onClick={runSimulation} disabled={isCrunching} className="absolute top-1/2 right-8 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white font-black py-6 px-6 rounded-full shadow-[0_10px_0_rgb(153,27,27)] active:shadow-none active:translate-y-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed z-30 border-4 border-red-800">
                        {isCrunching ? '...' : 'CRUNCH'}
                    </button>
                </div>

                {/* RIGHT: Unified Chatbot Interface */}
                <div className="lg:col-span-1 h-[600px]">
                    <AITutor 
                        history={chatHistory}
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        className="h-full"
                        suggestedActions={[
                            { label: "data 1 2 3", action: () => handleSendMessage("data 1 2 3") },
                            { label: "range 1 5", action: () => handleSendMessage("range 1 5") },
                            { label: "What is i?", action: () => handleSendMessage("What is i?") },
                        ]}
                    />
                </div>

            </main>

            <style>{`
                @keyframes conveyor { from { background-position: 0 0; } to { background-position: 20px 0; } }
                .animate-conveyor { animation: conveyor 1s linear infinite; }
                @keyframes shake { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(-5px, 5px) rotate(-5deg); } 50% { transform: translate(5px, -5px) rotate(5deg); } 75% { transform: translate(-5px, -5px) rotate(-5deg); } }
                .animate-shake { animation: shake 0.1s linear infinite; }
                @keyframes suck-in { 0% { transform: scale(1) translate(0, 0); opacity: 1; } 100% { transform: scale(0.1) translate(0, -150px); opacity: 0; } }
                .animate-drop-in { animation: dropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes dropIn { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default SummationMachine;
