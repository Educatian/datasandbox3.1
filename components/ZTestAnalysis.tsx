
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DistributionParams } from '../types';
import { calculateZTest, calculateMean2ForPValue, generateSampleData, calculateMean, normalCDF } from '../services/statisticsService';
import { getPValueExplanation } from '../services/geminiService';
import { logEvent } from '../services/loggingService';
import DistributionChart from './DistributionChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface ZTestAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
    moduleId?: string;
}

interface SampleMarker {
    id: number;
    zScore: number;
    isRejected: boolean;
    sampleMean: number;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onMouseUp?: () => void }> = ({ label, value, min, max, step, onChange, onMouseUp }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(1)}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            onMouseUp={onMouseUp}
            aria-label={label}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const ZTestAnalysis: React.FC<ZTestAnalysisProps> = ({ onBack, customTitle, customContext, moduleId }) => {
    // Check if this is Radar Detector mode
    const isRadarMode = moduleId === 'radar-detector';

    // ============ RADAR DETECTOR STATE ============
    const [totalRuns, setTotalRuns] = useState(0);
    const [totalRejections, setTotalRejections] = useState(0);
    const [sampleMarkers, setSampleMarkers] = useState<SampleMarker[]>([]);
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [radarSampleSize, setRadarSampleSize] = useState(30);
    const autoRunRef = useRef<number | null>(null);
    const markerIdRef = useRef(0);

    // Radar constants
    const POPULATION_MEAN = 50;
    const POPULATION_STD = 15;
    const ALPHA = 0.05;
    const Z_CRITICAL = 1.96;
    const BATCH_SIZE = 10;

    // ============ ORIGINAL Z-TEST STATE ============
    const [dist1, setDist1] = useState<DistributionParams>({ mean: 45, stdDev: 10, size: 100 });
    const [dist2, setDist2] = useState<DistributionParams>({ mean: 55, stdDev: 10, size: 100 });
    const [testResult, setTestResult] = useState({ zScore: 0, pValue: 1 });
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        isRadarMode
            ? "Welcome to The Radar Detector! 🎯 I'm Dr. Gem. Here, the null hypothesis is ALWAYS TRUE, but watch how we still get 'significant' results sometimes. That's a Type I Error - a False Alarm! Click 'Run 10 Samples' to start."
            : "Hello! I'm Dr. Gem. 🧪 Ready to test our hypothesis? Adjust the group means and let's check that p-value!",
        () => isRadarMode
            ? `
                Radar Detector Simulation (Type I Error Demo):
                Population Mean: ${POPULATION_MEAN}, Population Std: ${POPULATION_STD}
                Sample Size: ${radarSampleSize}, Alpha: ${ALPHA}
                Total Samples Run: ${totalRuns}
                Total Rejections (Type I Errors): ${totalRejections}
                Observed Error Rate: ${totalRuns > 0 ? ((totalRejections / totalRuns) * 100).toFixed(1) : 0}%
                Expected Rate: 5%

                IMPORTANT: The null hypothesis is ALWAYS TRUE in this simulation. Any rejection is a FALSE POSITIVE / TYPE I ERROR.
                Teach that this happens by design at rate alpha (5%).
            `
            : `
                Current Z-Test Simulation State:
                Group 1 (Control): Mean=${dist1.mean}, StdDev=${dist1.stdDev}, Size=${dist1.size}
                Group 2 (Experimental): Mean=${dist2.mean}, StdDev=${dist2.stdDev}, Size=${dist2.size}
                Result: Z-Score=${testResult.zScore.toFixed(3)}, p-value=${testResult.pValue.toExponential(4)}
                User Context: ${customContext || 'General Z-Test Analysis'}
            `
    );
    const [logPValue, setLogPValue] = useState(0);

    // ============ RADAR DETECTOR FUNCTIONS ============
    const runRadarBatch = useCallback(() => {
        const newMarkers: SampleMarker[] = [];
        let rejections = 0;

        for (let i = 0; i < BATCH_SIZE; i++) {
            // Generate sample from population where H0 is TRUE
            const sampleData = generateSampleData(POPULATION_MEAN, POPULATION_STD, radarSampleSize);
            const sampleMean = calculateMean(sampleData);
            const standardError = POPULATION_STD / Math.sqrt(radarSampleSize);
            const zScore = (sampleMean - POPULATION_MEAN) / standardError;
            const isRejected = Math.abs(zScore) > Z_CRITICAL;

            if (isRejected) rejections++;

            newMarkers.push({
                id: markerIdRef.current++,
                zScore,
                isRejected,
                sampleMean
            });
        }

        setTotalRuns(prev => prev + BATCH_SIZE);
        setTotalRejections(prev => prev + rejections);
        setSampleMarkers(prev => [...newMarkers, ...prev].slice(0, 100)); // Keep last 100
    }, [radarSampleSize]);

    // Auto-run effect
    useEffect(() => {
        if (isAutoRunning && isRadarMode) {
            autoRunRef.current = window.setInterval(() => {
                runRadarBatch();
            }, 500);
        }
        return () => {
            if (autoRunRef.current) {
                clearInterval(autoRunRef.current);
                autoRunRef.current = null;
            }
        };
    }, [isAutoRunning, isRadarMode, runRadarBatch]);

    const resetRadar = () => {
        setTotalRuns(0);
        setTotalRejections(0);
        setSampleMarkers([]);
        setIsAutoRunning(false);
        markerIdRef.current = 0;
    };

    // ============ ORIGINAL Z-TEST FUNCTIONS ============
    const distributionsForChart = useMemo(() => [
        { mean: dist1.mean, stdDev: dist1.stdDev, color: 'rgb(34 211 238)' },
        { mean: dist2.mean, stdDev: dist2.stdDev, color: 'rgb(236 72 153)' },
    ], [dist1, dist2]);

    useEffect(() => {
        if (!isRadarMode) {
            const result = calculateZTest(dist1, dist2);
            setTestResult(result);
            if (result.pValue > 0) {
                setLogPValue(Math.min(4, -Math.log10(result.pValue)));
            } else {
                setLogPValue(4);
            }
        }
    }, [dist1, dist2, isRadarMode]);

    const handlePValueSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLogP = parseFloat(e.target.value);
        setLogPValue(newLogP);
        const targetPValue = Math.pow(10, -newLogP);
        const newMean2 = calculateMean2ForPValue(targetPValue, dist1, { stdDev: dist2.stdDev, size: dist2.size }, dist2.mean);
        const clampedMean2 = Math.max(10, Math.min(90, newMean2));
        setDist2(d => ({ ...d, mean: clampedMean2 }));
    };

    // ============ RADAR DETECTOR RENDER ============
    if (isRadarMode) {
        const observedRate = totalRuns > 0 ? (totalRejections / totalRuns) * 100 : 0;
        const standardError = POPULATION_STD / Math.sqrt(radarSampleSize);

        return (
            <div className="w-full max-w-6xl mx-auto">
                <header className="mb-8">
                    <button onClick={onBack} className="text-rose-400 hover:text-rose-300 mb-4 inline-block">&larr; Back to Portal</button>
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-rose-400">The Radar Detector</h1>
                        <p className="text-slate-400 mt-2">Watch Type I Errors happen—even when the null hypothesis is TRUE!</p>
                    </div>
                </header>

                <div className="mb-6 bg-rose-500/10 border border-rose-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-rose-200 text-sm font-medium">
                        ⚠️ In this simulation, <strong>H₀ is ALWAYS TRUE</strong> (μ = {POPULATION_MEAN}).
                        Any "significant" result is a <strong>FALSE ALARM</strong> (Type I Error).
                    </p>
                </div>

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Visualization */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Sampling Distribution Visual */}
                        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Sampling Distribution of the Mean</h3>
                            <div className="relative h-48 bg-slate-900 rounded-lg overflow-hidden">
                                {/* Bell curve background (simplified) */}
                                <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                                    {/* Rejection regions - z = ±1.96 maps to x = 102 and 298 */}
                                    <rect x="0" y="0" width="102" height="100" fill="rgba(239, 68, 68, 0.15)" />
                                    <rect x="298" y="0" width="102" height="100" fill="rgba(239, 68, 68, 0.15)" />
                                    {/* Accept region */}
                                    <rect x="102" y="0" width="196" height="100" fill="rgba(34, 197, 94, 0.08)" />

                                    {/* Bell curve path - standard normal scaled to viewBox */}
                                    <path
                                        d="M 0,95 
                                           C 50,94 75,90 100,80 
                                           C 125,65 150,40 175,20 
                                           C 190,10 200,5 200,5 
                                           C 200,5 210,10 225,20 
                                           C 250,40 275,65 300,80 
                                           C 325,90 350,94 400,95"
                                        fill="none"
                                        stroke="rgba(148, 163, 184, 0.5)"
                                        strokeWidth="2"
                                    />
                                    {/* Filled area under curve */}
                                    <path
                                        d="M 0,95 
                                           C 50,94 75,90 100,80 
                                           C 125,65 150,40 175,20 
                                           C 190,10 200,5 200,5 
                                           C 200,5 210,10 225,20 
                                           C 250,40 275,65 300,80 
                                           C 325,90 350,94 400,95 
                                           L 400,100 L 0,100 Z"
                                        fill="url(#bellGradient)"
                                        opacity="0.3"
                                    />
                                    <defs>
                                        <linearGradient id="bellGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.4)" />
                                            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                                        </linearGradient>
                                    </defs>

                                    {/* Center line */}
                                    <line x1="200" y1="0" x2="200" y2="100" stroke="rgba(255,255,255,0.2)" strokeDasharray="4" />
                                    {/* Critical value lines at z = ±1.96 */}
                                    <line x1="102" y1="0" x2="102" y2="100" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="2" />
                                    <line x1="298" y1="0" x2="298" y2="100" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="2" />
                                    {/* Labels */}
                                    <text x="51" y="95" fill="#ef4444" fontSize="10" textAnchor="middle">-1.96</text>
                                    <text x="349" y="95" fill="#ef4444" fontSize="10" textAnchor="middle">+1.96</text>
                                    <text x="200" y="95" fill="#94a3b8" fontSize="10" textAnchor="middle">μ=50</text>
                                </svg>



                                {/* Sample markers */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {sampleMarkers.slice(0, 50).map((marker, idx) => {
                                        // Map z-score to x position (z=-4 to z=+4 -> 0 to 400)
                                        const xPercent = ((marker.zScore + 4) / 8) * 100;
                                        const opacity = Math.max(0.3, 1 - idx * 0.02);
                                        return (
                                            <div
                                                key={marker.id}
                                                className={`absolute w-2 h-2 rounded-full transform -translate-x-1/2 transition-all duration-300 ${marker.isRejected
                                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                                                    : 'bg-green-500'
                                                    }`}
                                                style={{
                                                    left: `${Math.max(2, Math.min(98, xPercent))}%`,
                                                    top: `${30 + Math.random() * 40}%`,
                                                    opacity
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                <span className="text-red-400">← Reject H₀</span>
                                <span className="text-green-400">Accept H₀ (Fail to Reject)</span>
                                <span className="text-red-400">Reject H₀ →</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <button
                                    onClick={runRadarBatch}
                                    disabled={isAutoRunning}
                                    className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 text-white font-bold py-4 rounded-lg shadow-lg transition-all transform active:scale-95"
                                >
                                    <span aria-hidden="true">🎯</span> Run {BATCH_SIZE} Samples
                                </button>
                                <button
                                    onClick={() => setIsAutoRunning(!isAutoRunning)}
                                    className={`font-bold py-4 rounded-lg shadow-lg transition-all ${isAutoRunning
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                        }`}
                                >
                                    {isAutoRunning ? '⏸ Stop Auto-Run' : '▶️ Auto-Run'}
                                </button>
                            </div>

                            <div className="mb-4">
                                <Slider
                                    label={`Sample Size (n = ${radarSampleSize})`}
                                    value={radarSampleSize}
                                    min={10}
                                    max={100}
                                    step={5}
                                    onChange={(e) => setRadarSampleSize(Number(e.target.value))}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Standard Error of Mean: σ/√n = {standardError.toFixed(2)}
                                </p>
                            </div>

                            <button
                                onClick={resetRadar}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm"
                            >
                                <span aria-hidden="true">🔄</span> Reset Experiment
                            </button>
                        </div>
                    </div>

                    {/* Right: Stats & Chat */}
                    <div className="space-y-6">
                        {/* Stats Panel */}
                        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl">
                            <h3 className="text-lg font-semibold text-rose-400 mb-4">Type I Error Tracker</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Total Samples:</span>
                                    <span className="text-2xl font-mono text-white">{totalRuns}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">False Alarms:</span>
                                    <span className="text-2xl font-mono text-red-400">{totalRejections}</span>
                                </div>
                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-slate-400">Observed Rate:</span>
                                        <span className={`text-xl font-mono ${Math.abs(observedRate - 5) < 2 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {observedRate.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Expected (α):</span>
                                        <span className="text-xl font-mono text-slate-300">5.0%</span>
                                    </div>
                                </div>

                                {/* Progress bar comparison */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-16">Observed</span>
                                        <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-500"
                                                style={{ width: `${Math.min(100, observedRate * 5)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-16">Expected</span>
                                        <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                                            <div className="h-full bg-slate-500" style={{ width: '25%' }} />
                                        </div>
                                    </div>
                                </div>

                                {totalRuns >= 100 && (
                                    <div className={`mt-4 p-3 rounded-lg border ${Math.abs(observedRate - 5) < 2
                                        ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        }`}>
                                        <p className="text-sm">
                                            {Math.abs(observedRate - 5) < 2
                                                ? "✅ As expected! The error rate converges to ~5% (α level)."
                                                : "📊 Keep sampling! The rate will converge to 5% with more samples."
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chat */}
                        <div className="h-[300px] rounded-lg">
                            <UnifiedGenAIChat
                                moduleTitle="Radar Detector"
                                history={chatHistory}
                                onSendMessage={sendMessage}
                                isLoading={isChatLoading}
                                variant="embedded"
                                className="h-full"
                            />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ============ ORIGINAL Z-TEST RENDER ============
    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">{customTitle || "Z-Test Analysis"}</h1>
                    <p className="text-slate-400 mt-2">Compare the means of two groups and see the statistical significance.</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-cyan-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-[400px]">
                    <DistributionChart distributions={distributionsForChart} />
                </div>
                <div className="md:col-span-1 flex flex-col space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3 border-b border-cyan-400/20 pb-2">Group 1 (Cyan)</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Mean" value={dist1.mean} min={10} max={90} step={0.5} onChange={(e) => setDist1(d => ({ ...d, mean: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 1 Mean', value: dist1.mean })} />
                                <Slider label="Standard Deviation" value={dist1.stdDev} min={2} max={20} step={0.5} onChange={(e) => setDist1(d => ({ ...d, stdDev: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 1 StdDev', value: dist1.stdDev })} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-pink-500 mb-3 border-b border-pink-500/20 pb-2">Group 2 (Pink)</h3>
                            <div className="space-y-4 mt-3">
                                <Slider label="Mean" value={dist2.mean} min={10} max={90} step={0.5} onChange={(e) => setDist2(d => ({ ...d, mean: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 2 Mean', value: dist2.mean })} />
                                <Slider label="Standard Deviation" value={dist2.stdDev} min={2} max={20} step={0.5} onChange={(e) => setDist2(d => ({ ...d, stdDev: +e.target.value }))} onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'Group 2 StdDev', value: dist2.stdDev })} />
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Test Results</h3>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-300">Z-Score:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {testResult.zScore.toFixed(3)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">p-value:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {testResult.pValue < 0.001 && testResult.pValue !== 0 ? testResult.pValue.toExponential(2) : testResult.pValue.toFixed(4)}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <label className="flex justify-between text-sm text-slate-400" htmlFor="p-value-slider">
                                <span>Adjust p-value (moves Group 2)</span>
                            </label>
                            <input
                                id="p-value-slider"
                                type="range"
                                min={0}
                                max={4}
                                step={0.01}
                                value={logPValue}
                                onChange={handlePValueSliderChange}
                                onMouseUp={() => logEvent('slider_change', 'ZTestAnalysis', { control: 'p-value_adjust', value: Math.pow(10, -logPValue) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-1"
                                aria-label="Adjust p-value"
                            />
                        </div>
                    </div>

                    <div className="h-[300px] rounded-lg">
                        <UnifiedGenAIChat
                            moduleTitle={customTitle || "Z-Test Analysis"}
                            history={chatHistory}
                            onSendMessage={sendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>

                </div>
            </main >
        </div >
    );
};

export default ZTestAnalysis;

