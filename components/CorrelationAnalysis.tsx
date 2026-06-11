import React, { useState, useEffect, useCallback } from 'react';
import { Point, RegressionLine } from '../types';
import { calculateCorrelation, calculateLinearRegression, generateCorrelatedData } from '../services/statisticsService';
import ScatterPlot from './ScatterPlot';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import ReactionTimeVisualizer from './ReactionTimeVisualizer';
import Slider from './ui/Slider';
import DataContextCard from './ui/DataContextCard';
import { useGeminiChat } from '../hooks/useGeminiChat';
import { bivariateDatasets, getDataset, scalePointsToViewport, BivariateDataset } from '../data/realDatasets';
import MissionPanel, { MissionDef } from './ui/MissionPanel';
import { logEvent } from '../services/loggingService';
import { supabase, isSupabaseConfigured } from '../services/supabaseService';

interface CorrelationAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
}

const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [scenario, setScenario] = useState<'abstract' | 'experiment' | 'real'>('abstract');
    const [datasetId, setDatasetId] = useState<string>('galton-heights');
    const [points, setPoints] = useState<Point[]>([]);
    const [correlation, setCorrelation] = useState<number>(0);
    const [regressionLine, setRegressionLine] = useState<RegressionLine>({ slope: 0, intercept: 0 });

    const realDataset = scenario === 'real' ? (getDataset(datasetId) as BivariateDataset | undefined) : undefined;

    const { chatHistory, isChatLoading, sendMessage, addBotMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can help you analyze the correlation between these variables. Generate some data, run an experiment, or load a real dataset to get started!",
        () => `
            We are analyzing Correlation.
            Scenario: ${scenario === 'abstract' ? 'Abstract Data' : scenario === 'experiment' ? 'Reaction Time Experiment (Distraction vs. Reaction)' : `REAL dataset: ${realDataset?.name} (${realDataset?.xLabel} vs ${realDataset?.yLabel}; ${realDataset?.source}). Context: ${realDataset?.contextNote}`}
            Number of points: ${points.length}
            Correlation Coefficient (r): ${correlation.toFixed(3)}
            Correlation Strength: ${getCorrelationStrength(correlation)}
            Regression Line: y = ${regressionLine.slope.toFixed(2)}x + ${regressionLine.intercept.toFixed(2)}

            Explain the strength and direction of the relationship.${scenario === 'real' ? ' Ground every explanation in the real-world meaning of these variables.' : ''}
        `
    );

    // Abstract Mode State
    const [targetCorrelation, setTargetCorrelation] = useState(0.8);
    const [spread, setSpread] = useState(15);

    // Experiment Mode State
    const [distractionLevel, setDistractionLevel] = useState(10);

    // Cooperative class dataset state (pooled experiment trials from all users)
    const [classDataStatus, setClassDataStatus] = useState<'idle' | 'loading' | 'loaded' | 'insufficient' | 'error'>('idle');

    const generateAbstractData = useCallback(() => {
        const data = generateCorrelatedData(30, targetCorrelation, spread);
        setPoints(data);
    }, [targetCorrelation, spread]);

    const loadRealDataset = useCallback((id: string) => {
        const ds = getDataset(id) as BivariateDataset | undefined;
        if (!ds) return;
        const scaled = scalePointsToViewport(ds.points);
        setPoints(scaled.map((p, i) => ({ id: i, x: p.x, y: p.y })));
    }, []);

    useEffect(() => {
        setClassDataStatus('idle');
        if (scenario === 'abstract') {
            generateAbstractData();
            addBotMessage("I've generated some abstract data. Adjust the correlation slider to see how the scatter plot changes.");
        } else if (scenario === 'real') {
            const ds = getDataset(datasetId);
            loadRealDataset(datasetId);
            addBotMessage(`Loaded real data: ${ds?.name}. Every point is a real measurement — try dragging one into an outlier position and watch what happens to r.`);
        } else {
            setPoints([]); // Clear for experiment
            addBotMessage("We're running a Reaction Time experiment now. Set the distraction level and click 'Measure Reaction' to collect data points.");
        }
    }, [scenario, datasetId, generateAbstractData, loadRealDataset]);

    useEffect(() => {
        const corr = calculateCorrelation(points);
        const line = calculateLinearRegression(points);
        setCorrelation(corr);
        setRegressionLine(line);
    }, [points]);

    const handleExperimentTest = () => {
        // X: Distraction Level (0-100)
        // Y: Reaction Time (Simulated 0-100 scale)
        // Higher Distraction -> Higher Reaction Time (Positive Correlation)
        const baseReaction = 20;
        const effect = 0.6 * distractionLevel;
        const noise = (Math.random() - 0.5) * 40; // Individual variability

        let reactionTime = baseReaction + effect + noise;
        reactionTime = Math.max(5, Math.min(95, reactionTime));

        const newPoint: Point = {
            id: Date.now(),
            x: distractionLevel + (Math.random() - 0.5) * 5, // Slight jitter in x
            y: reactionTime
        };

        setPoints(prev => [...prev, newPoint]);

        // Contribute this trial to the pooled class dataset
        logEvent('experiment_trial', 'correlation-maker', { x: newPoint.x, y: newPoint.y });
    };

    // Load the pooled class dataset (anonymous trials from all users) via RPC.
    // Degrades gracefully: the RPC may not be applied yet, or may hold too few rows.
    const loadClassDataset = async () => {
        if (!isSupabaseConfigured) return;
        setClassDataStatus('loading');
        try {
            const { data, error } = await supabase.rpc('get_class_experiment_points', {
                p_module: 'correlation-maker',
                p_limit: 300
            });
            if (error) throw error;
            const rows = ((data || []) as Array<{ x: number; y: number }>)
                .filter(r => typeof r.x === 'number' && typeof r.y === 'number' && Number.isFinite(r.x) && Number.isFinite(r.y));
            if (rows.length < 5) {
                setClassDataStatus('insufficient');
                return;
            }
            const base = Date.now();
            setPoints(rows.map((r, i) => ({ id: base + i, x: r.x, y: r.y })));
            setClassDataStatus('loaded');
        } catch {
            setClassDataStatus('error');
        }
    };

    const handlePointUpdate = useCallback((id: number, newX: number, newY: number) => {
        setPoints(prevPoints =>
            prevPoints.map(p => (p.id === id ? { ...p, x: newX, y: newY } : p))
        );
    }, []);

    const getCorrelationStrength = (r: number) => {
        const abs = Math.abs(r);
        if (abs < 0.1) return "No Correlation";
        const direction = r > 0 ? "Positive" : "Negative";
        if (abs < 0.3) return `Weak ${direction}`;
        if (abs < 0.7) return `Moderate ${direction}`;
        return `Strong ${direction}`;
    };

    // Mission layer: goals checked against the live points and r
    const missions: MissionDef[] = [
        {
            id: 'build-strong',
            title: 'Build a strong positive',
            brief: 'Get r to +0.9 or higher with at least 10 points on the board. Use the Abstract generator, drag points by hand, or run enough clean experiment trials.',
            hint: 'In Abstract mode, push Target Correlation up and Noise down, then Generate. Or drag points into a tight rising band.',
            check: () => points.length >= 10 && correlation >= 0.9
        },
        {
            id: 'crash-it',
            title: 'Crash the correlation',
            brief: 'With at least 12 points on the board, land r between +0.2 and +0.4. The spirit of the challenge: start from a strong upward pattern and see how few moved or added points it takes to wreck it.',
            hint: 'One or two points dragged far off the band do shocking damage. r is fragile to outliers.',
            check: () => points.length >= 12 && correlation >= 0.2 && correlation <= 0.4
        },
        {
            id: 'negative-territory',
            title: 'Negative territory',
            brief: 'Reach r of -0.7 or lower with at least 10 points, in the Reaction experiment or Abstract mode. Make Y fall as X rises.',
            hint: 'In the experiment, the true relation is positive, so you will have to drag points. In Abstract mode, slide Target Correlation below -0.7.',
            check: () => points.length >= 10 && correlation <= -0.7
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">{customTitle || "Correlation Analysis"}</h1>
                    <p className="text-slate-400 mt-2">{scenario === 'experiment' ? "Cognitive Experiment: Distraction vs. Reaction Time" : "Explore linear relationships between variables."}</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-cyan-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <div className="flex justify-center mb-6">
                <div className="bg-slate-800 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setScenario('abstract')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'abstract' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Abstract Data
                    </button>
                    <button
                        onClick={() => setScenario('experiment')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'experiment' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span aria-hidden="true">🧠</span> Reaction Experiment
                    </button>
                    <button
                        onClick={() => setScenario('real')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'real' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span aria-hidden="true">🌍</span> Real Data
                    </button>
                </div>
            </div>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Visualizer (Experiment Mode) - Only visible in experiment mode */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-3' : 'hidden'} bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col items-center`}>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4">Experimental Setup</h3>
                    <ReactionTimeVisualizer distractionLevel={distractionLevel} onTest={handleExperimentTest} />
                    <div className="w-full mt-6 px-2 space-y-4">
                        <h4 className="text-sm font-semibold text-slate-300">Independent Variable</h4>
                        <Slider label="Distraction Level" value={distractionLevel} min={0} max={100} step={5} onChange={(e) => setDistractionLevel(+e.target.value)} format={(v) => v.toFixed(2)} />
                    </div>
                </div>

                {/* Center Panel: Scatter Plot */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-6' : 'lg:col-span-8'} bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-[500px]`}>
                    <ScatterPlot
                        data={points}
                        line={regressionLine}
                        onPointUpdate={handlePointUpdate}
                        showRegressionLine={false}
                        xAxisLabel={scenario === 'experiment' ? "Distraction Level" : realDataset ? `${realDataset.xLabel} (${realDataset.unitX}, rescaled)` : "Variable X"}
                        yAxisLabel={scenario === 'experiment' ? "Reaction Time (ms)" : realDataset ? `${realDataset.yLabel} (${realDataset.unitY}, rescaled)` : "Variable Y"}
                    />
                </div>

                {/* Right Panel: Controls & Metrics */}
                <div className={`${scenario === 'experiment' ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col space-y-8`}>
                    <MissionPanel moduleId="correlation-maker" missions={missions} accentClass="text-cyan-400" />

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Data Controls</h3>

                        {scenario === 'abstract' && (
                            <div className="space-y-4 animate-fade-in">
                                <Slider label="Target Correlation (r)" value={targetCorrelation} min={-1} max={1} step={0.1} onChange={(e) => setTargetCorrelation(+e.target.value)} format={(v) => v.toFixed(2)} />
                                <Slider label="Noise / Spread" value={spread} min={1} max={40} step={1} onChange={(e) => setSpread(+e.target.value)} format={(v) => v.toFixed(2)} />
                                <button
                                    onClick={generateAbstractData}
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Generate New Data
                                </button>
                            </div>
                        )}
                        {scenario === 'experiment' && (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-sm text-slate-400">
                                    Perform trials at different distraction levels to build your dataset.
                                </p>
                                <button
                                    onClick={() => setPoints([])}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Reset Experiment
                                </button>
                                {isSupabaseConfigured && (
                                    <div className="pt-3 border-t border-slate-700 space-y-2">
                                        <button
                                            onClick={loadClassDataset}
                                            disabled={classDataStatus === 'loading'}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                        >
                                            {classDataStatus === 'loading' ? 'Loading...' : 'Load Class Dataset'}
                                        </button>
                                        {classDataStatus === 'loaded' && (
                                            <p className="text-xs text-slate-400 text-center">
                                                Pooled anonymous trials from everyone who ran this experiment
                                            </p>
                                        )}
                                        {classDataStatus === 'insufficient' && (
                                            <p className="text-xs text-slate-500 text-center">
                                                Not enough class data yet. Run a few trials to contribute.
                                            </p>
                                        )}
                                        {classDataStatus === 'error' && (
                                            <p className="text-xs text-slate-500 text-center">
                                                Class dataset is not available right now.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {scenario === 'real' && (
                            <div className="space-y-4 animate-fade-in">
                                <label className="text-sm text-slate-400 block" htmlFor="dataset-select">Dataset</label>
                                <select
                                    id="dataset-select"
                                    value={datasetId}
                                    onChange={(e) => setDatasetId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 outline-none"
                                >
                                    {bivariateDatasets().map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => loadRealDataset(datasetId)}
                                    className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Reload Original Data
                                </button>
                            </div>
                        )}
                    </div>

                    {realDataset && <DataContextCard dataset={realDataset} />}

                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Statistics</h3>
                        <div className="flex flex-col mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Correlation (r):</span>
                                <span className="text-2xl font-mono bg-slate-900 px-3 py-1 rounded text-cyan-400">
                                    {correlation.toFixed(3)}
                                </span>
                            </div>
                            <div className="text-right mt-1 text-sm text-slate-400 font-medium">
                                {points.length > 1 ? getCorrelationStrength(correlation) : "Add points"}
                            </div>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Correlation Analysis"
                            history={chatHistory}
                            onSendMessage={sendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default CorrelationAnalysis;

