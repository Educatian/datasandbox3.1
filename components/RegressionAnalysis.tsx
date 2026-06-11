
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ResidualPoint, RegressionLine } from '../types';
import { calculateLinearRegression, calculateRSquared, calculateStandardError } from '../services/statisticsService';
import RegressionScatterPlot from './RegressionScatterPlot';
import SpringVisualizer from './SpringVisualizer';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import DataContextCard from './ui/DataContextCard';
import { useGeminiChat } from '../hooks/useGeminiChat';
import { bivariateDatasets, getDataset, scalePointsToViewport, BivariateDataset } from '../data/realDatasets';
import MissionPanel, { MissionDef } from './ui/MissionPanel';

interface RegressionAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
    moduleId?: string;
}

const generateInitialData = (count: number): ResidualPoint[] => {
    return Array.from({ length: count }, (_, i) => {
        const x = Math.random() * 70 + 15; // 15 to 85
        const y = 20 + (x * 0.8) + (Math.random() - 0.5) * 30; // Clustered around a line
        return {
            id: i,
            x: x,
            y: Math.max(0, Math.min(100, y)),
            yHat: 0,
            residual: 0,
        };
    });
};

const generateRandomCloud = (count: number): ResidualPoint[] => {
    return Array.from({ length: count }, (_, i) => {
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 80 + 10; // Pure chaos
        return {
            id: i,
            x: x,
            y: y,
            yHat: 0,
            residual: 0,
        };
    });
};

const RegressionAnalysis: React.FC<RegressionAnalysisProps> = ({ onBack, customTitle, customContext, moduleId }) => {
    const [points, setPoints] = useState<ResidualPoint[]>(() => generateInitialData(25));
    // Chat State
    const welcomeMessage = moduleId === 'residual-rain'
        ? "Welcome to Residual Rain! ☔ Tilt the line to minimize the squared errors (the rain)!"
        : moduleId === 'prediction-painter'
            ? "Welcome to The Prediction Painter! 🎨 The data is a mess. Drag the dots to *create* a linear relationship and increase the R-Squared score!"
            : "Welcome to Regression Analysis! 📉 I'm Dr. Gem. Try tilting the line to minimize prediction errors. Can you beat the computer's best fit?";
    const { chatHistory, isChatLoading, sendMessage, addBotMessage } = useGeminiChat(
        welcomeMessage,
        () => `
            Regression Analysis (${scenario} mode):
            - Points: ${points.length}
            - Line: Slope=${effectiveLine.slope.toFixed(2)}, Intercept=${effectiveLine.intercept.toFixed(2)}
            - R-Squared: ${rSquared.toFixed(3)}
            - Standard Error: ${standardError.toFixed(2)}
            - Manual Mode: ${isManualMode}
            - Has Outlier: ${hasOutlier}
            ${scenario === 'real' && realDataset ? `- REAL dataset: ${realDataset.name} (X = ${realDataset.xLabel} in ${realDataset.unitX}, Y = ${realDataset.yLabel} in ${realDataset.unitY}; values linearly rescaled to a 0-100 canvas, so the pattern and R-squared are unchanged but slope/intercept are in canvas units). Source: ${realDataset.source}. Context: ${realDataset.contextNote}
            Ground every explanation of the fit, residuals, and R-squared in the real-world meaning of these variables.` : ''}
            Goal: Understand relationship between X and Y.
        `
    );
    const [hasOutlier, setHasOutlier] = useState<boolean>(false);

    // Mode Selection
    const [scenario, setScenario] = useState<'abstract' | 'physics' | 'real'>('abstract');
    const [datasetId, setDatasetId] = useState<string>('galton-heights');
    const realDataset = scenario === 'real' ? (getDataset(datasetId) as BivariateDataset | undefined) : undefined;

    // Interaction States — Manual mode ON by default for hands-on learning
    const [isManualMode, setIsManualMode] = useState(true);
    const [manualLine, setManualLine] = useState<RegressionLine>({ slope: 0.5, intercept: 35 });
    const [showSquares, setShowSquares] = useState(false);
    const [interactionMode, setInteractionMode] = useState<'pointer' | 'brush' | 'spray'>('pointer');
    const [showConfidenceCone, setShowConfidenceCone] = useState(true);
    const [useSAE, setUseSAE] = useState(false);
    const [showPredictionInterval, setShowPredictionInterval] = useState(true);
    const [showMeanLine, setShowMeanLine] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);

    // Physics Experiment State
    const [springMass, setSpringMass] = useState(20);

    // Prediction Tool State
    const [predictX, setPredictX] = useState<number>(50);

    // Initial Setup based on Module ID
    useEffect(() => {
        if (moduleId === 'residual-rain') {
            setIsManualMode(true);
            setShowSquares(true);
            setScenario('abstract');
            setPoints(generateInitialData(25));
        } else if (moduleId === 'prediction-painter') {
            setIsManualMode(false);
            setScenario('abstract');
            setPoints(generateRandomCloud(25));
        }
    }, [moduleId]);

    const handlePointUpdate = useCallback((id: number, newX: number, newY: number) => {
        setPoints(prevPoints =>
            prevPoints.map(p => (p.id === id ? { ...p, x: newX, y: newY } : p))
        );
    }, []);

    const handleAddPoint = useCallback((x: number, y: number) => {
        setPoints(prevPoints => [
            ...prevPoints,
            { id: Date.now(), x, y, yHat: 0, residual: 0 }
        ]);
    }, []);

    const loadRealDataset = useCallback((id: string) => {
        const ds = getDataset(id) as BivariateDataset | undefined;
        if (!ds || ds.kind !== 'bivariate') return;
        const scaled = scalePointsToViewport(ds.points);
        setPoints(scaled.map((p, i) => ({ id: i, x: p.x, y: p.y, yHat: 0, residual: 0 })));
    }, []);

    const resetData = () => {
        if (scenario === 'physics') {
            setPoints([]);
        } else if (scenario === 'real') {
            loadRealDataset(datasetId);
        } else if (moduleId === 'prediction-painter') {
            setPoints(generateRandomCloud(25));
        } else {
            setPoints(generateInitialData(25));
        }
    };

    // Handle switching scenarios
    useEffect(() => {
        if (scenario === 'physics') {
            setPoints([]); // Clear points for fresh experiment
            setManualLine({ slope: 0.6, intercept: 20 }); // Close to 'true' physics params
            addBotMessage("Entering Physics Mode! 🧪 Use the slider to change mass, then click 'Measure' to collect data. Can you discover Hooke's Law?");
        } else if (scenario === 'real') {
            const ds = getDataset(datasetId);
            loadRealDataset(datasetId);
            addBotMessage(`Loaded real data: ${ds?.name}. Every point is a real measurement, rescaled to this canvas. Try fitting the line by hand, then snap to the best fit and see how close you got.`);
        } else {
            setPoints(generateInitialData(25));
            addBotMessage("Back to Abstract Mode. Try to minimize the squared errors!");
        }
    }, [scenario, datasetId, loadRealDataset]);

    // Physics measurement logic
    const handleMeasureSpring = () => {
        // Physics Model: Length = NaturalLength + Elasticity * Mass + Noise
        const naturalLength = 20;
        const elasticity = 0.6;
        const noise = (Math.random() - 0.5) * 8; // Measurement error

        const measuredLength = naturalLength + (elasticity * springMass) + noise;

        handleAddPoint(springMass, measuredLength);
    };

    // 1. Calculate Auto Regression Line
    const autoLine = useMemo(() => calculateLinearRegression(points), [points]);

    // 2. Determine Effective Line
    const effectiveLine = isManualMode ? manualLine : autoLine;

    // 3. Calculate Statistics & Pivot Point
    const meanX = useMemo(() => points.length > 0 ? points.reduce((s, p) => s + p.x, 0) / points.length : 50, [points]);
    const meanY = useMemo(() => points.length > 0 ? points.reduce((s, p) => s + p.y, 0) / points.length : 50, [points]);

    const rSquared = useMemo(() => calculateRSquared(points, effectiveLine), [points, effectiveLine]);
    const standardError = useMemo(() => calculateStandardError(points, effectiveLine), [points, effectiveLine]);
    const autoRSquared = useMemo(() => calculateRSquared(points, autoLine), [points, autoLine]);

    // Sum of Squared Errors (SSE)
    const sse = useMemo(() => {
        return points.reduce((sum, p) => {
            const yHat = effectiveLine.slope * p.x + effectiveLine.intercept;
            return sum + Math.pow(p.y - yHat, 2);
        }, 0);
    }, [points, effectiveLine]);

    const autoSse = useMemo(() => {
        return points.reduce((sum, p) => {
            const yHat = autoLine.slope * p.x + autoLine.intercept;
            return sum + Math.pow(p.y - yHat, 2);
        }, 0);
    }, [points, autoLine]);

    // Sum of Absolute Errors (SAE)
    const sae = useMemo(() => {
        return points.reduce((sum, p) => {
            const yHat = effectiveLine.slope * p.x + effectiveLine.intercept;
            return sum + Math.abs(p.y - yHat);
        }, 0);
    }, [points, effectiveLine]);

    const autoSae = useMemo(() => {
        return points.reduce((sum, p) => {
            const yHat = autoLine.slope * p.x + autoLine.intercept;
            return sum + Math.abs(p.y - yHat);
        }, 0);
    }, [points, autoLine]);

    // Snap-to-fit animation
    const handleSnapToFit = () => {
        if (!isManualMode) return;
        setIsSnapping(true);
        const startSlope = manualLine.slope;
        const startIntercept = manualLine.intercept;
        const targetSlope = autoLine.slope;
        const targetIntercept = autoLine.intercept;
        const duration = 800;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            setManualLine({
                slope: startSlope + (targetSlope - startSlope) * eased,
                intercept: startIntercept + (targetIntercept - startIntercept) * eased
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsSnapping(false);
            }
        };
        requestAnimationFrame(animate);
    };

    // 4. Prepare Display Points with Residuals based on Effective Line
    const displayPoints = useMemo(() => {
        let maxResidual = 0;
        const updated = points.map(p => {
            const yHat = effectiveLine.slope * p.x + effectiveLine.intercept;
            const residual = p.y - yHat;
            if (Math.abs(residual) > maxResidual) maxResidual = Math.abs(residual);
            return { ...p, yHat, residual };
        });
        return { points: updated, maxResidual };
    }, [points, effectiveLine]);

    useEffect(() => {
        setHasOutlier(displayPoints.maxResidual > 35 && points.length > 5);
    }, [displayPoints.maxResidual, points.length]);


    // Predicted Y for the tool
    const predictedY = effectiveLine.slope * predictX + effectiveLine.intercept;

    // Mission layer (Residual Rain): goals checked against the live line, SSE, and R-squared
    const missions: MissionDef[] = [
        {
            id: 'beat-the-rain',
            title: 'Beat the rain by hand',
            brief: 'Tilt the line yourself until your SSE lands within 10% of the best possible SSE. Snap to Best Fit does not count: the check only passes while your line is your own.',
            hint: 'The line rotates around the data\'s center, so the slope slider is all you need. Watch the SSE number against the Best possible SSE below it.',
            check: () => isManualMode && !isSnapping && points.length >= 5 && autoSse > 0 && sse > autoSse && sse <= autoSse * 1.1
        },
        {
            id: 'r2-architect',
            title: 'Build an R-squared above 0.9',
            brief: 'Push R-squared above 0.9 with at least 10 points on the board. Drag the dots into a tight rising band, then line the model up with it.',
            hint: 'R-squared compares your line\'s errors to a flat mean line. Tighten the points around a clear trend, then tilt or snap the line to match.',
            check: () => points.length >= 10 && rSquared > 0.9
        },
        {
            id: 'leverage-lesson',
            title: 'Leverage lesson',
            brief: 'With at least 15 points on the board, drag ONE point somewhere extreme and watch even the computer\'s best possible fit collapse: get the best-fit R-squared below 0.5.',
            hint: 'A single far-out point dominates the squared errors. Drag one dot toward a corner of the canvas and check the Best R-squared readout.',
            check: () => points.length >= 15 && Number.isFinite(autoRSquared) && autoRSquared < 0.5
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            <header className="mb-4 shrink-0">
                <button onClick={onBack} className="text-yellow-400 hover:text-yellow-300 mb-2 inline-block text-sm">&larr; Back to Portal</button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-yellow-400 leading-tight">{customTitle || "Regression Analysis"}</h1>
                        <p className="text-slate-400 text-sm">{scenario === 'physics' ? "Hooke's Law Experiment: Mass vs. Spring Extension" : scenario === 'real' && realDataset ? `Real data: ${realDataset.name}. Fit the line to actual measurements.` : "Minimizing Prediction Error (Least Squares)"}</p>
                    </div>

                    <div className={`${moduleId === 'residual-rain' || moduleId === 'prediction-painter' ? 'hidden' : ''}`}>
                        <div className="bg-slate-800 p-1 rounded-lg inline-flex text-xs">
                            <button
                                onClick={() => setScenario('abstract')}
                                className={`px-3 py-1.5 rounded-md transition-colors ${scenario === 'abstract' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Abstract Data
                            </button>
                            <button
                                onClick={() => setScenario('physics')}
                                className={`px-3 py-1.5 rounded-md transition-colors ${scenario === 'physics' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <span aria-hidden="true">🧪</span> Physics Experiment
                            </button>
                            <button
                                onClick={() => setScenario('real')}
                                className={`px-3 py-1.5 rounded-md transition-colors ${scenario === 'real' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <span aria-hidden="true">🌍</span> Real Data
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {customContext && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-lg text-center shrink-0">
                    <p className="text-yellow-200 text-xs font-medium">Mission: {customContext}</p>
                </div>
            )}

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden pb-4">
                {/* Left Panel: Visualizer (Physics Mode) or Chart (Abstract Mode) */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-3' : 'hidden'} bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col items-center overflow-y-auto`}>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4">Experimental Setup</h3>
                    <SpringVisualizer mass={springMass} onMeasure={handleMeasureSpring} />
                    <div className="w-full mt-6 px-2 shrink-0">
                        <Slider label="Add Mass (g)" value={springMass} min={0} max={100} step={5} onChange={(e) => setSpringMass(+e.target.value)} format={(v) => v.toFixed(2)} />
                    </div>
                </div>

                {/* Center Panel: Scatter Plot */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-6' : 'lg:col-span-8'} bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4 min-h-0`}>
                    <div className="w-full h-full flex items-center justify-center">
                        <RegressionScatterPlot
                            data={displayPoints.points}
                            line={effectiveLine}
                            onPointUpdate={handlePointUpdate}
                            onAddPoint={handleAddPoint}
                            showSquares={showSquares}
                            showSAE={useSAE}
                            showPredictionInterval={showPredictionInterval}
                            showMeanLine={showMeanLine}
                            predictX={predictX}
                            onPredictXChange={setPredictX}
                            xAxisLabel={scenario === 'physics' ? "Mass (grams)" : scenario === 'real' && realDataset ? `${realDataset.xLabel} (${realDataset.unitX}, rescaled)` : (moduleId === 'prediction-painter' ? "Particle Position" : "Independent Variable (X)")}
                            yAxisLabel={scenario === 'physics' ? "Spring Length (cm)" : scenario === 'real' && realDataset ? `${realDataset.yLabel} (${realDataset.unitY}, rescaled)` : (moduleId === 'prediction-painter' ? "Energy State" : "Dependent Variable (Y)")}
                            pointColor={moduleId === 'prediction-painter' ? 'rgb(192 38 211)' : undefined}
                            lineColor={moduleId === 'prediction-painter' ? 'rgb(249 115 22)' : undefined}
                            isQuantumMode={moduleId === 'prediction-painter'}
                            rSquared={rSquared}
                            meanPoint={{ x: meanX, y: meanY }}
                            interactionMode={interactionMode}
                            showConfidenceCone={moduleId === 'prediction-painter' ? showConfidenceCone : false}
                        />
                    </div>
                </div>

                {/* Right Panel: Controls & Chat */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col space-y-4 min-h-0 overflow-hidden`}>

                    {/* Scrollable Side Content */}
                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                        {/* Mission layer (Residual Rain module) */}
                        {moduleId === 'residual-rain' && (
                            <MissionPanel moduleId="residual-rain" missions={missions} accentClass="text-yellow-400" />
                        )}

                        {/* Mode Toggle & Controls */}
                        <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-base font-semibold uppercase tracking-wider ${moduleId === 'prediction-painter' ? 'text-teal-400' : 'text-yellow-400'}`}>
                                    {moduleId === 'prediction-painter' ? 'Beam Calibration' : 'Analysis Model'}
                                </h3>
                                <div className={`flex bg-slate-700/50 rounded-lg p-0.5 ${moduleId === 'residual-rain' || moduleId === 'prediction-painter' ? 'hidden' : ''}`}>
                                    <button
                                        onClick={() => setIsManualMode(false)}
                                        className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition-colors ${!isManualMode ? 'bg-yellow-600 text-white' : 'text-slate-400'}`}
                                    >
                                        Auto Fit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsManualMode(true);
                                            if (!isManualMode) setManualLine(autoLine);
                                        }}
                                        className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold transition-colors ${isManualMode ? 'bg-yellow-600 text-white' : 'text-slate-400'}`}
                                    >
                                        Manual
                                    </button>
                                </div>
                            </div>

                            {/* Quantum Toolbox — Prediction Painter only */}
                            {moduleId === 'prediction-painter' && (
                                <div className="mb-4 p-3 bg-slate-900/60 rounded-lg border border-teal-700/40">
                                    <div className="text-[10px] text-teal-500 uppercase font-bold mb-2 tracking-widest">⚛️ Quantum Tools</div>
                                    <div className="flex gap-2 mb-3">
                                        {(['pointer', 'brush', 'spray'] as const).map((mode) => {
                                            const labels = { pointer: '🖱 Adjust', brush: '🖌 Paint', spray: '💨 Spray' };
                                            const active = { pointer: 'bg-teal-500/20 border-teal-500 text-teal-300', brush: 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300', spray: 'bg-orange-500/20 border-orange-500 text-orange-300' };
                                            return (
                                                <button key={mode} onClick={() => setInteractionMode(mode)}
                                                    className={`flex-1 py-2 rounded border transition-all text-xs font-bold uppercase tracking-tighter ${interactionMode === mode ? active[mode] : 'bg-slate-800 border-slate-700 text-slate-500'
                                                        }`}>
                                                    {labels[mode]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Confidence Cone</span>
                                        <button onClick={() => setShowConfidenceCone(!showConfidenceCone)}
                                            aria-label="Toggle confidence cone"
                                            aria-pressed={showConfidenceCone}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${showConfidenceCone ? 'bg-teal-500' : 'bg-slate-700'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showConfidenceCone ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Real Dataset Picker */}
                            {scenario === 'real' && (
                                <div className="mb-4 space-y-2 animate-fade-in">
                                    <label className="text-xs text-slate-400 block uppercase tracking-wider font-bold" htmlFor="regression-dataset-select">Dataset</label>
                                    <select
                                        id="regression-dataset-select"
                                        value={datasetId}
                                        onChange={(e) => setDatasetId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 outline-none"
                                    >
                                        {bivariateDatasets().map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        Real measurements, rescaled to this canvas. Drag points or tilt the line: the goal is to fit the line to the real pattern. Reset Data restores the original measurements.
                                    </p>
                                </div>
                            )}

                            {/* Visual Toggles */}
                            <div className="grid grid-cols-1 gap-3 mb-6">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="checkbox" checked={showSquares} onChange={(e) => setShowSquares(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Show Errors (SAE/SSE)</span>
                                </label>
                                {showSquares && (
                                    <div className="ml-6 flex bg-slate-700/50 rounded-lg p-1 animate-fade-in">
                                        <button
                                            onClick={() => setUseSAE(false)}
                                            className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${!useSAE ? 'bg-yellow-600 text-white' : 'text-slate-400'}`}
                                            title="Sum of Squared Errors"
                                        >
                                            SSE (Squares)
                                        </button>
                                        <button
                                            onClick={() => setUseSAE(true)}
                                            className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${useSAE ? 'bg-yellow-600 text-white' : 'text-slate-400'}`}
                                            title="Sum of Absolute Errors"
                                        >
                                            SAE (Absolute)
                                        </button>
                                    </div>
                                )}
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="checkbox" checked={showPredictionInterval} onChange={(e) => setShowPredictionInterval(e.target.checked)} className="accent-teal-500 w-4 h-4" />
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Show Uncertainty Interval</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="checkbox" checked={showMeanLine} onChange={(e) => setShowMeanLine(e.target.checked)} className="accent-blue-500 w-4 h-4" />
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Show Mean Y (Baseline)</span>
                                </label>
                            </div>

                            {/* Manual Controls */}
                            {isManualMode && (
                                <div className="space-y-4 border-t border-slate-700 pt-4 animate-fade-in mb-4">
                                    <Slider
                                        label={scenario === 'physics' ? "Elasticity (Slope)" : "Slope (β₁)"}
                                        value={manualLine.slope}
                                        min={-2} max={2} step={0.01}
                                        format={(v) => v.toFixed(2)}
                                        onChange={(e) => {
                                            const newSlope = +e.target.value;
                                            // Force rotation around the pivot (meanX, meanY)
                                            // y = mx + b => b = y - mx
                                            const newIntercept = meanY - (newSlope * meanX);
                                            setManualLine({ slope: newSlope, intercept: newIntercept });
                                        }}
                                    />
                                    <div className="p-2 bg-yellow-500/5 border border-yellow-500/10 rounded-md text-[10px] text-yellow-200/50 italic leading-snug">
                                        Rotation is anchored at the data's center (The Fulcrum). To move the line up/down, reposition the data points.
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={resetData}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                                >
                                    Reset Data
                                </button>
                                {isManualMode && (
                                    <button
                                        onClick={handleSnapToFit}
                                        disabled={isSnapping}
                                        className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        {isSnapping ? '⏳ Fitting...' : '🎯 Snap to Best Fit'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {scenario === 'real' && realDataset && <DataContextCard dataset={realDataset} />}

                        {/* Model Metrics */}
                        <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 shadow-lg space-y-3">
                            <h3 className="text-base font-semibold text-white uppercase tracking-wider mb-2">Model Metrics</h3>

                            {/* Error Metric — The core metric for manual mode */}
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300" title={useSAE ? "Sum of Absolute Errors" : "Sum of Squared Errors"}>
                                    {useSAE ? "SAE" : "SSE"} (Error):
                                </span>
                                <span className={`text-xl font-mono bg-slate-900 px-3 py-1 rounded transition-colors ${isManualMode && (useSAE ? sae <= autoSae * 1.05 : sse <= autoSse * 1.05) ? 'text-emerald-400' : 'text-orange-400'
                                    }`}>
                                    {(useSAE ? sae : sse).toFixed(1)}
                                </span>
                            </div>

                            {/* (Toolbox moved to top of Beam Calibration card) */}

                            {isManualMode && (
                                <div className="text-xs text-slate-500">
                                    Best possible {useSAE ? 'SAE' : 'SSE'}: <span className="text-yellow-400 font-mono">{(useSAE ? autoSae : autoSse).toFixed(1)}</span>
                                    {(useSAE ? sae <= autoSae * 1.05 : sse <= autoSse * 1.05) && <span className="text-emerald-400 ml-2">✨ Near optimal!</span>}
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">R-squared ($R^2$):</span>
                                <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded text-yellow-400">
                                    {rSquared.toFixed(3)}
                                </span>
                            </div>
                            {isManualMode && autoRSquared > 0 && (
                                <div className="text-xs text-slate-500">
                                    Best R²: <span className="text-yellow-400 font-mono">{autoRSquared.toFixed(3)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300" title="Standard Error of the Estimate">Std. Error ($S_e$):</span>
                                <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded text-slate-200">
                                    {standardError.toFixed(2)}
                                </span>
                            </div>
                            {scenario === 'physics' && (
                                <p className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">
                                    <strong>Physical Interpretation:</strong><br />
                                    Slope ≈ 0.6 (Elasticity)<br />
                                    Intercept ≈ 20 (Rest Length)
                                </p>
                            )}

                            {/* Error Bucket Visual Goal */}
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="flex justify-between text-xs text-slate-500 mb-1 font-bold uppercase tracking-tighter">
                                    <span>{moduleId === 'prediction-painter' ? 'Calibration Stability' : 'Optimization Goal'}</span>
                                    <span>{((useSAE ? autoSae / sae : autoSse / sse) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                    <div
                                        className={`h-full transition-all duration-500 ${isManualMode && (useSAE ? sae <= autoSae * 1.1 : sse <= autoSse * 1.1)
                                            ? (moduleId === 'prediction-painter' ? 'bg-teal-500 shadow-[0_0_10px_#2dd4bf]' : 'bg-emerald-500')
                                            : 'bg-orange-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (useSAE ? autoSae / sae : autoSse / sse) * 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic text-center">
                                    {moduleId === 'prediction-painter' ? 'Align particles to stabilize the beam' : 'Minimize the area to hit the target!'}
                                </p>
                            </div>
                        </div>

                        {/* Prediction Tool */}
                        <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50 shadow-lg">
                            <h3 className="text-base font-semibold text-teal-400 uppercase tracking-wider mb-3">Prediction Tool</h3>
                            <div className="space-y-3">
                                <label className="flex flex-col text-sm text-slate-400">
                                    <span>Input {scenario === 'physics' ? 'Mass (g)' : scenario === 'real' && realDataset ? `${realDataset.xLabel} (rescaled)` : 'X Value'}:</span>
                                    <div className="flex items-center space-x-3 mt-1">
                                        <input
                                            type="range" min={0} max={100} value={predictX}
                                            onChange={(e) => setPredictX(+e.target.value)}
                                            className="flex-grow h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="font-mono w-10 text-right text-white">{predictX}</span>
                                    </div>
                                </label>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                                    <span className="text-slate-300">Predicted {scenario === 'physics' ? 'Length' : scenario === 'real' && realDataset ? realDataset.yLabel : 'Y'}:</span>
                                    <span className="text-xl font-bold font-mono text-teal-400">
                                        {Math.min(100, Math.max(0, predictedY)).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Chat Section: Fixed height at bottom of sidebar */}
                    <div className="h-64 bg-slate-800/50 rounded-lg border border-slate-700/50 shadow-lg overflow-hidden shrink-0">
                        <UnifiedGenAIChat
                            moduleTitle="Regression Analysis"
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
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
                @keyframes quantum-flicker {
                    0% { opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { opacity: 0.7; }
                }
                .quantum-beam-glow {
                    animation: quantum-flicker 0.2s infinite;
                }
                @keyframes fulcrum-pulse {
                    0% { transform: scale(1); opacity: 0.3; }
                    50% { transform: scale(1.5); opacity: 0.1; }
                    100% { transform: scale(1); opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

export default RegressionAnalysis;

