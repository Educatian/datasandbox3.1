import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogisticPoint, LogisticCurveParams } from '../types';
import { calculateLogisticRegression, predictLogisticProbability } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import LogisticRegressionPlot from './LogisticRegressionPlot';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';
import DataContextCard from './ui/DataContextCard';
import { getDataset, BinaryOutcomeDataset } from '../data/realDatasets';

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

const CHALLENGER_LAUNCH_TEMP = 31; // deg F, the morning of the disaster

const LogisticRegressionAnalysis: React.FC<LogisticRegressionAnalysisProps> = ({ onBack }) => {
    const [points, setPoints] = useState<LogisticPoint[]>(() => generateInitialData(40));
    const [curveParams, setCurveParams] = useState<LogisticCurveParams>({ beta0: 0, beta1: 0 });
    const [selectedPoint, setSelectedPoint] = useState<LogisticPoint | null>(null);
    const [realDataset, setRealDataset] = useState<BinaryOutcomeDataset | null>(null);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can explain how we predict binary outcomes (like Pass/Fail). Click on a point to see its predicted probability, or load the Challenger data for a real case!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const updatePoint = useCallback((id: number, newX: number, newOutcome: 0 | 1) => {
        setPoints(prev => prev.map(p => p.id === id ? { ...p, x: newX, outcome: newOutcome } : p));
    }, []);

    const addPoint = useCallback((x: number, outcome: 0 | 1) => {
        setPoints(prev => [...prev, { id: Date.now(), x, outcome }]);
    }, []);

    const resetData = () => {
        setPoints(generateInitialData(40));
        setRealDataset(null);
        setSelectedPoint(null);
    };

    const loadChallenger = useCallback(() => {
        const ds = getDataset('challenger-orings');
        if (!ds || ds.kind !== 'binary') return;
        // Temperatures (53-81 deg F) fit the plot's 0-100 x-domain directly,
        // so no rescaling is needed; the IRLS fit works in real units.
        setPoints(ds.points.map((p, i) => ({ id: i, x: p.x, outcome: p.outcome })));
        setRealDataset(ds);
        setSelectedPoint(null);
        setChatHistory(prev => [...prev, {
            text: "Loaded real data: Challenger O-Rings (1986). Each point is a real shuttle launch: x is launch temperature in deg F, and 1 means O-ring damage occurred. Challenger launched at 31 deg F, colder than every flight you see here. Ask me what the fitted curve implies about that morning.",
            role: 'model'
        }]);
    }, []);

    useEffect(() => {
        const params = calculateLogisticRegression(points);
        setCurveParams(params);
    }, [points]);

    const handlePointSelect = useCallback((point: LogisticPoint | null) => {
        setSelectedPoint(point);
    }, []);

    const decisionBoundary = useMemo(() => {
        if (curveParams.beta1 === 0) return null;
        return -curveParams.beta0 / curveParams.beta1;
    }, [curveParams]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        let selectedPointInfo = '';
        if (selectedPoint) {
            const prob = predictLogisticProbability(selectedPoint.x, curveParams);
            selectedPointInfo = `Selected Point: x=${selectedPoint.x.toFixed(1)}, Outcome=${selectedPoint.outcome}, Predicted Prob=${prob.toFixed(3)}.`;
        }

        const realInfo = realDataset
            ? `REAL dataset: ${realDataset.name} (x = launch temperature in deg F, outcome 1 = O-ring damage; ${realDataset.source}). Context: ${realDataset.contextNote} Challenger itself launched at ${CHALLENGER_LAUNCH_TEMP} deg F, below every temperature in this data; the fitted curve extrapolates to P(O-ring damage) = ${predictLogisticProbability(CHALLENGER_LAUNCH_TEMP, curveParams).toFixed(3)} at ${CHALLENGER_LAUNCH_TEMP} deg F. Ground every explanation in these real variables.`
            : '';

        const context = `
            We are analyzing Logistic Regression.
            ${realInfo}
            Decision Boundary (x value where prob=0.5): ${decisionBoundary !== null ? decisionBoundary.toFixed(2) : 'N/A'}
            Curve Parameters: Beta0=${curveParams.beta0.toFixed(3)}, Beta1=${curveParams.beta1.toFixed(3)}
            ${selectedPointInfo}

            User Question: ${msg}

            ${realDataset
                ? 'Explain the relationship between launch temperature (x, deg F) and the probability of O-ring damage, including the danger of extrapolating below the observed temperatures.'
                : 'Explain the relationship between the study hours (x) and the probability of passing.'}
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the logistic curve right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [curveParams, decisionBoundary, selectedPoint, realDataset]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-sky-400 hover:text-sky-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-sky-400">Logistic Regression</h1>
                    <p className="text-slate-400 mt-2">
                        {realDataset
                            ? 'Predict O-ring damage (1 = damage) from launch temperature (deg F).'
                            : 'Predict a binary outcome (Pass/Fail) based on a variable (Study Hours).'}
                    </p>
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
                    {realDataset && (
                        <p className="text-xs text-slate-400 mt-2 text-center">
                            x axis: launch temperature (deg F). Real launches span 53 to 81 deg F; Challenger launched at 31 deg F, left of every observed point.
                        </p>
                    )}
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
                            onClick={loadChallenger}
                            className="mt-6 w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            <span aria-hidden="true">🌍</span> Load Challenger Data
                        </button>
                        <button
                            onClick={resetData}
                            className="mt-2 w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                            Reset Data
                        </button>
                    </div>

                    {realDataset && <DataContextCard dataset={realDataset} />}

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Logistic Regression"
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

export default LogisticRegressionAnalysis;
