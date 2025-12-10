
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ResidualPoint, RegressionLine } from '../types';
import { calculateLinearRegression, calculateRSquared, calculateStandardError } from '../services/statisticsService';
import { getRegressionExplanation } from '../services/geminiService';
import RegressionScatterPlot from './RegressionScatterPlot';
import SpringVisualizer from './SpringVisualizer';
import GeminiExplanation from './GeminiExplanation';

interface RegressionAnalysisProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
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

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(2)}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const RegressionAnalysis: React.FC<RegressionAnalysisProps> = ({ onBack, customTitle, customContext }) => {
    const [points, setPoints] = useState<ResidualPoint[]>(() => generateInitialData(25));
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasOutlier, setHasOutlier] = useState<boolean>(false);

    // Mode Selection
    const [scenario, setScenario] = useState<'abstract' | 'physics'>('abstract');

    // Interaction States
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualLine, setManualLine] = useState<RegressionLine>({ slope: 1, intercept: 20 });
    const [showSquares, setShowSquares] = useState(false);
    const [showMeanLine, setShowMeanLine] = useState(false);
    
    // Physics Experiment State
    const [springMass, setSpringMass] = useState(20);
    
    // Prediction Tool State
    const [predictX, setPredictX] = useState<number>(50);

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
    
    const resetData = () => {
        if (scenario === 'physics') {
             setPoints([]);
        } else {
             setPoints(generateInitialData(25));
        }
    };

    // Handle switching scenarios
    useEffect(() => {
        if (scenario === 'physics') {
            setPoints([]); // Clear points for fresh experiment
            setExplanation("Perform the experiment! Use the slider to change the mass, then click 'Measure' to plot data points.");
            setIsLoading(false);
            setManualLine({ slope: 0.6, intercept: 20 }); // Close to 'true' physics params
        } else {
            setPoints(generateInitialData(25));
        }
    }, [scenario]);

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

    // 3. Calculate Statistics
    const rSquared = useMemo(() => calculateRSquared(points, effectiveLine), [points, effectiveLine]);
    const standardError = useMemo(() => calculateStandardError(points, effectiveLine), [points, effectiveLine]);

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


    // Fetch explanation when R-squared changes significantly (Only in Abstract Mode)
    useEffect(() => {
        if (scenario === 'physics') return; 
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getRegressionExplanation(rSquared, hasOutlier);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [rSquared, hasOutlier, scenario]);

    // Predicted Y for the tool
    const predictedY = effectiveLine.slope * predictX + effectiveLine.intercept;

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-yellow-400 hover:text-yellow-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-yellow-400">{customTitle || "Regression Analysis"}</h1>
                    <p className="text-slate-400 mt-2">{scenario === 'physics' ? "Hooke's Law Experiment: Mass vs. Spring Extension" : "Minimizing Prediction Error (Least Squares)"}</p>
                </div>
            </header>

            {customContext && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg text-center max-w-3xl mx-auto">
                    <p className="text-yellow-200 text-sm font-medium">Mission: {customContext}</p>
                </div>
            )}

            <div className="flex justify-center mb-6">
                <div className="bg-slate-800 p-1 rounded-lg inline-flex">
                    <button 
                        onClick={() => setScenario('abstract')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'abstract' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Abstract Data
                    </button>
                    <button 
                        onClick={() => setScenario('physics')}
                        className={`px-4 py-2 rounded-md transition-colors ${scenario === 'physics' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        🧪 Physics Experiment
                    </button>
                </div>
            </div>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Visualizer (Physics Mode) or Chart (Abstract Mode) */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-3' : 'hidden'} bg-slate-800 rounded-lg shadow-2xl p-4 flex flex-col items-center`}>
                     <h3 className="text-lg font-semibold text-yellow-400 mb-4">Experimental Setup</h3>
                     <SpringVisualizer mass={springMass} onMeasure={handleMeasureSpring} />
                     <div className="w-full mt-6 px-2">
                        <Slider label="Add Mass (g)" value={springMass} min={0} max={100} step={5} onChange={(e) => setSpringMass(+e.target.value)} />
                     </div>
                </div>

                {/* Center Panel: Scatter Plot */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-6' : 'lg:col-span-8'} bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4`}>
                    <RegressionScatterPlot 
                        data={displayPoints.points} 
                        line={effectiveLine} 
                        onPointUpdate={handlePointUpdate}
                        onAddPoint={handleAddPoint}
                        showSquares={showSquares}
                        showMeanLine={showMeanLine}
                        xAxisLabel={scenario === 'physics' ? "Mass (grams)" : "Independent Variable (X)"}
                        yAxisLabel={scenario === 'physics' ? "Spring Length (cm)" : "Dependent Variable (Y)"}
                    />
                </div>

                {/* Right Panel: Controls */}
                <div className={`${scenario === 'physics' ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col space-y-6`}>
                    
                    {/* Mode Toggle & Controls */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-yellow-400">Analysis Model</h3>
                            <div className="flex bg-slate-700 rounded-lg p-1">
                                <button 
                                    onClick={() => setIsManualMode(false)}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${!isManualMode ? 'bg-yellow-600 text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Auto Fit
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsManualMode(true);
                                        if (!isManualMode) setManualLine(autoLine);
                                    }}
                                    className={`px-3 py-1 rounded-md text-sm transition-colors ${isManualMode ? 'bg-yellow-600 text-white' : 'text-slate-300 hover:text-white'}`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>

                        {/* Visual Toggles */}
                        <div className="grid grid-cols-1 gap-3 mb-6">
                             <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={showSquares} onChange={(e) => setShowSquares(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Show Squared Errors (Least Squares)</span>
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
                                    onChange={(e) => setManualLine(prev => ({ ...prev, slope: +e.target.value }))} 
                                />
                                <Slider 
                                    label={scenario === 'physics' ? "Natural Length (Intercept)" : "Intercept (β₀)"}
                                    value={manualLine.intercept} 
                                    min={-20} max={120} step={1} 
                                    onChange={(e) => setManualLine(prev => ({ ...prev, intercept: +e.target.value }))} 
                                />
                            </div>
                        )}
                        
                         <button 
                            onClick={resetData}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                        >
                            Reset Data
                        </button>
                    </div>

                    {/* Model Metrics */}
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-3">
                         <h3 className="text-lg font-semibold text-white mb-2">Model Metrics</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">R-squared ($R^2$):</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded text-yellow-400">
                                {rSquared.toFixed(3)}
                            </span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-slate-300" title="Standard Error of the Estimate">Std. Error ($S_e$):</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded text-slate-200">
                                {standardError.toFixed(2)}
                            </span>
                        </div>
                        {scenario === 'physics' && (
                             <p className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">
                                <strong>Physical Interpretation:</strong><br/>
                                Slope ≈ 0.6 (Elasticity)<br/>
                                Intercept ≈ 20 (Rest Length)
                            </p>
                        )}
                    </div>
                    
                    {/* Prediction Tool */}
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-teal-400 mb-3">Prediction Tool</h3>
                        <div className="space-y-3">
                            <label className="flex flex-col text-sm text-slate-400">
                                <span>Input {scenario === 'physics' ? 'Mass (g)' : 'X Value'}:</span>
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
                                <span className="text-slate-300">Predicted {scenario === 'physics' ? 'Length' : 'Y'}:</span>
                                <span className="text-xl font-bold font-mono text-teal-400">
                                    {Math.min(100, Math.max(0, predictedY)).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
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

export default RegressionAnalysis;
