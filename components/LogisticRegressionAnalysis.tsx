import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogisticPoint, LogisticCurveParams } from '../types';
import { calculateLogisticRegression, predictLogisticProbability } from '../services/statisticsService';
import { getLogisticRegressionExplanation } from '../services/geminiService';
import LogisticRegressionPlot from './LogisticRegressionPlot';
import GeminiExplanation from './GeminiExplanation';

interface LogisticRegressionAnalysisProps {
    onBack: () => void;
}

const generateInitialData = (count: number): LogisticPoint[] => {
    return Array.from({ length: count }, (_, i) => {
        const outcome = Math.random() > 0.5 ? 1 : 0;
        const x = (outcome === 1 ? 60 : 40) + (Math.random() - 0.5) * 40;
        return {
            id: i,
            x: Math.max(0, Math.min(100, x)),
            outcome,
        };
    });
};

const LogisticRegressionAnalysis: React.FC<LogisticRegressionAnalysisProps> = ({ onBack }) => {
    const [points, setPoints] = useState<LogisticPoint[]>(() => generateInitialData(40));
    const [curveParams, setCurveParams] = useState<LogisticCurveParams>({ beta0: 0, beta1: 0 });
    const [selectedPoint, setSelectedPoint] = useState<LogisticPoint | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const updatePoint = useCallback((id: number, newX: number, newOutcome: 0 | 1) => {
        setPoints(prev => prev.map(p => p.id === id ? { ...p, x: newX, outcome: newOutcome } : p));
    }, []);

    const addPoint = useCallback((x: number, outcome: 0 | 1) => {
        setPoints(prev => [...prev, { id: Date.now(), x, outcome }]);
    }, []);
    
    const resetData = () => setPoints(generateInitialData(40));

    useEffect(() => {
        const params = calculateLogisticRegression(points);
        setCurveParams(params);
    }, [points]);

    const handlePointSelect = useCallback(async (point: LogisticPoint | null) => {
        setSelectedPoint(point);
        if (point === null) {
            setExplanation(null);
            return;
        }
        setIsLoading(true);
        const probability = predictLogisticProbability(point.x, curveParams);
        const exp = await getLogisticRegressionExplanation(point.x, probability, 'Study Hours', 'Pass');
        setExplanation(exp);
        setIsLoading(false);
    }, [curveParams]);
    
    const decisionBoundary = useMemo(() => {
        if (curveParams.beta1 === 0) return null;
        return -curveParams.beta0 / curveParams.beta1;
    }, [curveParams]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-sky-400 hover:text-sky-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-sky-400">Logistic Regression</h1>
                    <p className="text-slate-400 mt-2">Predict a binary outcome (Pass/Fail) based on a variable (Study Hours).</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <LogisticRegressionPlot 
                        data={points} 
                        curveParams={curveParams}
                        onUpdatePoint={updatePoint}
                        onAddPoint={addPoint}
                        onSelectPoint={handlePointSelect}
                        selectedPointId={selectedPoint?.id}
                    />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                         <h3 className="text-lg font-semibold text-sky-400 mb-3">Model Info</h3>
                         <p className="text-sm text-slate-400 mb-4">Click to add points. Drag points up or down to change their group.</p>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">Decision Boundary:</span>
                            <span className="text-xl font-mono bg-slate-900 px-3 py-1 rounded">
                                {decisionBoundary === null || !isFinite(decisionBoundary) ? 'N/A' : decisionBoundary.toFixed(2)}
                            </span>
                        </div>
                         <button 
                            onClick={resetData}
                            className="mt-6 w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            Reset Data
                        </button>
                    </div>
                    <GeminiExplanation 
                        explanation={selectedPoint ? explanation : "Click on a data point to get an explanation of its predicted probability."} 
                        isLoading={isLoading} 
                    />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    This is perfect for predicting a binary outcome. For example, can we predict whether a student will complete an online course (Yes/No) based on how many videos they watched in the first week? The model provides a probability, which can be used to identify students who need encouragement or support early on to prevent them from dropping out.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LogisticRegressionAnalysis;