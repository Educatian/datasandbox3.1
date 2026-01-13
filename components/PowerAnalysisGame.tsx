
import React, { useState, useEffect, useRef } from 'react';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { getChatResponse } from '../services/geminiService';

interface PowerAnalysisGameProps {
    onBack: () => void;
}

const PowerAnalysisGame: React.FC<PowerAnalysisGameProps> = ({ onBack }) => {
    // Game State
    const [sampleSize, setSampleSize] = useState<number>(30); // "Fuel"
    const [effectSize, setEffectSize] = useState<number>(0.5); // "Turbine Efficiency"
    const [alpha, setAlpha] = useState<number>(0.05); // "Safety Valve"
    const [power, setPower] = useState<number>(0);
    const [isOverloaded, setIsOverloaded] = useState<boolean>(false); // Type I error risk warning

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Welcome to The Power Station! ⚡ I'm Dr. Gem, your Plant Manager. Adjust the Fuel (Sample Size) and Safety Valve (Alpha) to generate enough Power (0.80) to light up the city!" }
    ]);
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

    // --- Statistical Utils (Local) ---
    const normalCDF = (x: number): number => {
        var t = 1 / (1 + .2316419 * Math.abs(x));
        var d = .3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) prob = 1 - prob;
        return prob;
    };

    const invNorm = (p: number): number => {
        // Simple approx for key values or Beasley-Springer-Moro if needed. 
        // For game sliders, a lookup or simple approx is fine. 
        // Let's use a simplified inverse since we control the inputs.
        // Or actually, let's just use the known critical values for standard Alphas if we snap, 
        // but for a slider we need continuous.
        // Copying the robust one from service for smoothness:
        if (p >= 1) return 5;
        if (p <= 0) return -5;
        const a1 = -3.969683028665376e+01, a2 = 2.209460984245205e+02, a3 = -2.759285104469687e+02;
        const a4 = 1.383577518672690e+02, a5 = -3.066479806614716e+01, a6 = 2.506628277459239e+00;
        const b1 = -5.447609879822406e+01, b2 = 1.615858368580409e+02, b3 = -1.556989798598866e+02;
        const b4 = 6.680131188771972e+01, b5 = -1.328068155288572e+01;
        const c1 = -7.784894002430293e-03, c2 = -3.223964580411365e-01, c3 = -2.400758277161838e+00;
        const c4 = -2.549732539343734e+00, c5 = 4.374664141464968e+00, c6 = 2.938163982698783e+00;
        const d1 = 7.784695709041462e-03, d2 = 3.224671290700398e-01, d3 = 2.445134137142996e+00;
        const d4 = 3.754408661907416e+00;
        const p_low = 0.02425, p_high = 1 - p_low;
        let q, r;
        if (p < p_low) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else if (p <= p_high) {
            q = p - 0.5;
            r = q * q;
            return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
                (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }
    };

    // Calculate Power effect
    useEffect(() => {
        // Two-tailed Z-test Power Calculation
        // Power = 1 - beta
        // beta = P(accept H0 | H1 is true)
        // Critical Z (right tail) = invNorm(1 - alpha/2)
        // Z_beta = Critical Z - (d * sqrt(n))
        // Power = P(Z > Z_beta) = 1 - CDF(Z_beta) = CDF(-Z_beta) = CDF(d*sqrt(n) - Z_crit)

        const zCrit = invNorm(1 - alpha / 2);
        const zMeasure = effectSize * Math.sqrt(sampleSize);
        const calcPower = normalCDF(zMeasure - zCrit);

        setPower(calcPower);
        setIsOverloaded(alpha > 0.10); // Warning threshold
    }, [sampleSize, effectSize, alpha]);

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
        setIsChatLoading(true);

        const status = power > 0.8 ? "OPTIMAL" : power > 0.5 ? "UNSTABLE" : "FAILURE";

        const context = `
            You are the Chief Operations Officer of a Statistical Power Plant. 
            Your job is to help the user generate enough "Statistical Power" (Energy) to light up the city (reach 80% or 0.8), 
            without blowing the Safety Valve (Alpha > 0.05).

            TEACHING ANALOGIES:
            - **Sample Size (n)** is **Fuel**. It costs money (effort), but it's the reliable way to get power.
            - **Effect Size (d)** is **Turbine Efficiency**. If the real-world effect is strong (d=1.0), the generator is super efficient. If it's weak (d=0.2), you need TONS of fuel (n) to get any power.
            - **Alpha (α)** is the **Safety Valve**. You can cheat and get more power by loosening the valve (increasing Alpha to 0.10 or 0.20), but you risk a "Meltdown" (False Positive / Type I Error). Real scientists keep this tight at 0.05.
            - **Power (1-β)** is the **Electricity**. We aim for 0.80 (80%). Below that, the city is dark (Type II Error - we missed the effect).

            CURRENT STATUS:
            Power Station Status:
            - System Status: ${status}
            - Current Power Output: ${(power * 100).toFixed(1)}% (Target: 80%)
            - Sample Size (Fuel): ${sampleSize}
            - Effect Size (Turbine Efficiency): ${effectSize.toFixed(2)}
            - Alpha (Safety Valve): ${alpha.toFixed(3)}
            - Warnings: ${isOverloaded ? "SAFETY VALVE CRITICAL (Type I Risk High - False Positive likely)" : "None"}

            Goal: Teach the user about Statistical Power (1-β).
            
            Game Metaphors:
            - Sample Size (n) = Fuel. More fuel = more power, but expensive.
            - Effect Size (d) = Turbine Efficiency. Small effect needs HUGE fuel to get power.
            - Alpha (α) = Safety Valve. Opening it gets 'cheap' power but risks blowing up (False Positive).
            
            If they ask "How do I win?", tell them to get Power > 80% without letting Alpha > 0.10.
            Be encouraging but strict about safety (Alpha). If they set Alpha > 0.10, warn them about "Regulatory Fines" (Peer Review Rejection).
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { role: 'model', text: response }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'model', text: "COMMUNICATION FAILURE: Dr. Gem is offline." }]);
        } finally {
            setIsChatLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-amber-500/30">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-indigo-500/30 shadow-lg z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-indigo-400 flex items-center gap-2">
                            The Power Station ⚡
                        </h1>
                        <p className="text-xs text-slate-500 font-mono tracking-wider">STATISTICAL POWER GENERATION FACILITY</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 text-sm font-mono">
                    <div className={`flex flex-col items-end ${power >= 0.8 ? 'text-amber-400' : 'text-slate-500'}`}>
                        <span className="text-[10px] uppercase opacity-50">Grid Status</span>
                        <span className="font-bold flex items-center gap-2">
                            {power >= 0.8 ? "ONLINE" : "OFFLINE"}
                            <span className={`w-2 h-2 rounded-full ${power >= 0.8 ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`}></span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Visual Dashboard (Left/Center) */}
                <div className="flex-1 p-8 overflow-y-auto relative flex flex-col items-center">

                    {/* The Power Plant Visualization */}
                    <div className="w-full max-w-4xl bg-slate-900/50 rounded-3xl border border-slate-700/50 p-8 shadow-2xl relative mb-8 backdrop-blur-sm">

                        {/* Status Warning Overlay */}
                        {isOverloaded && (
                            <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500 text-red-400 px-3 py-1 rounded text-xs font-bold animate-pulse flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                HIGH FALSE ALARM RISK (Alpha High)
                            </div>
                        )}

                        <div className="flex justify-between items-end mb-12">
                            {/* Gauge */}
                            <div className="relative w-64 h-32 mx-auto">
                                <div className="absolute inset-0 bg-slate-800 rounded-t-full overflow-hidden border-4 border-slate-700 border-b-0">
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 origin-bottom transition-all duration-700 ease-out`}
                                        style={{
                                            height: '100%',
                                            backgroundColor: power >= 0.8 ? '#fbbf24' : '#6366f1',
                                            transform: `rotate(${(power * 180) - 180}deg)`,
                                            opacity: 0.5
                                        }}
                                    ></div>
                                </div>
                                <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 text-center z-10">
                                    <div className="text-5xl font-bold text-white mb-1 tabular-nums">{(power * 100).toFixed(0)}<span className="text-2xl text-slate-400">%</span></div>
                                    <div className="text-xs text-slate-400 uppercase tracking-widest">Power Output</div>
                                </div>
                                {/* Needle (CSS Hack) */}
                                <div
                                    className="absolute bottom-0 left-1/2 w-1 h-28 bg-white origin-bottom rounded-full transition-transform duration-700 ease-out"
                                    style={{ transform: `translateX(-50%) rotate(${(power * 180) - 90}deg)` }}
                                ></div>
                                <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-slate-200 rounded-full -translate-x-1/2 translate-y-1/2 shadow-lg"></div>
                            </div>
                        </div>

                        {/* City Lights Visualization */}
                        <div className="h-48 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative">
                            {/* Background Sky */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-slate-950"></div>

                            {/* City Silhouettes */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 opacity-30">
                                {[...Array(20)].map((_, i) => (
                                    <div key={i} className="bg-slate-800 w-8 mx-0.5 rounded-t-sm" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                                ))}
                            </div>

                            {/* Windows (The Lights) */}
                            <div className="absolute inset-0 flex items-end justify-center gap-1">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={`light-${i}`}
                                        className="bg-transparent w-8 mx-0.5 flex flex-col-reverse gap-1 p-1"
                                        style={{ height: `${20 + Math.random() * 60}%` }}
                                    >
                                        {[...Array(6)].map((_, j) => (
                                            <div
                                                key={j}
                                                className={`w-full h-2 rounded-sm transition-all duration-1000 ${power > 0.8 ? 'bg-amber-300 shadow-[0_0_5px_rgba(252,211,77,0.8)]' : 'bg-slate-800'}`}
                                                style={{
                                                    opacity: power > (0.2 + (j / 10) + (i / 40)) ? 1 : 0.1
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Target Line */}
                            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
                                <div className={`absolute top-1/2 left-0 right-0 border-t border-dashed transition-colors ${power >= 0.8 ? 'border-amber-500/50' : 'border-slate-600/50'} flex justify-center`}>
                                    <span className="bg-slate-900 px-2 text-[10px] -mt-2.5 text-slate-500">80% TIPPING POINT</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Sample Size Control */}
                        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-slate-300 font-bold flex items-center gap-2">
                                    <span className="text-indigo-400">⚡ Sample Size (n)</span>
                                </label>
                                <span className="bg-slate-900 px-2 py-1 rounded text-mono text-indigo-300">{sampleSize}</span>
                            </div>
                            <input
                                type="range"
                                min="5" max="200" step="5"
                                value={sampleSize}
                                onChange={(e) => setSampleSize(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                            />
                            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                                The amount of "fuel" (data) you have. More fuel costs more but generates reliable power.
                            </p>
                        </div>

                        {/* Effect Size Control */}
                        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-slate-300 font-bold flex items-center gap-2">
                                    <span className="text-emerald-400">⚙️ Effect Size (d)</span>
                                </label>
                                <span className="bg-slate-900 px-2 py-1 rounded text-mono text-emerald-300">{effectSize}</span>
                            </div>
                            <input
                                type="range"
                                min="0.1" max="1.5" step="0.1"
                                value={effectSize}
                                onChange={(e) => setEffectSize(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                            />
                            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                                The magnitude of the phenomenon. Like better turbine technology, big effects maximize output.
                            </p>
                        </div>

                        {/* Alpha Control */}
                        <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 relative overflow-hidden">
                            {isOverloaded && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>}
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-slate-300 font-bold flex items-center gap-2">
                                    <span className={`transition-colors ${isOverloaded ? 'text-red-400' : 'text-rose-400'}`}>
                                        ⚠️ Alpha (α)
                                    </span>
                                </label>
                                <span className={`bg-slate-900 px-2 py-1 rounded text-mono transition-colors ${isOverloaded ? 'text-red-400' : 'text-rose-300'}`}>{alpha}</span>
                            </div>
                            <input
                                type="range"
                                min="0.01" max="0.20" step="0.01"
                                value={alpha}
                                onChange={(e) => setAlpha(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 transition-all"
                            />
                            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                                The Safety Valve. Loosening it (High Alpha) boosts power easily but risks false alarms (Type I Error).
                            </p>
                        </div>

                    </div>
                </div>

                {/* Right Chat Panel */}
                <div className="w-[400px] border-l border-slate-800 bg-slate-900/50 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                                <span className="text-xl">🏭</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Plant Manager Gem</h3>
                                <p className="text-xs text-indigo-400">Chief Operations Officer</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden h-full">
                        <UnifiedGenAIChat
                            moduleTitle="The Power Station"
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

export default PowerAnalysisGame;
