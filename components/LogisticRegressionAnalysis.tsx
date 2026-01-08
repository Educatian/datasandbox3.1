import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogisticPoint, LogisticCurveParams } from '../types';
import { calculateLogisticRegression, predictLogisticProbability } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import LogisticRegressionPlot from './LogisticRegressionPlot';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

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

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can explain how we predict binary outcomes (like Pass/Fail). Click on a point to see its predicted probability!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

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

    const handlePointSelect = useCallback((point: LogisticPoint | null) => {
        setSelectedPoint(point);
    }, []);

    const decisionBoundary = useMemo(() => {
        if (curveParams.beta1 === 0) return null;
        return -curveParams.beta0 / curveParams.beta1;
    }, [curveParams]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        let selectedPointInfo = '';
        if (selectedPoint) {
            const prob = predictLogisticProbability(selectedPoint.x, curveParams);
            selectedPointInfo = `Selected Point: x=${selectedPoint.x.toFixed(1)}, Outcome=${selectedPoint.outcome}, Predicted Prob=${prob.toFixed(3)}.`;
        }

        const context = `
            We are analyzing Logistic Regression.
            Decision Boundary (x value where prob=0.5): ${decisionBoundary !== null ? decisionBoundary.toFixed(2) : 'N/A'}
            Curve Parameters: Beta0=${curveParams.beta0.toFixed(3)}, Beta1=${curveParams.beta1.toFixed(3)}
            ${selectedPointInfo}
            
            User Question: ${msg}
            
            Explain the relationship between the study hours (x) and the probability of passing.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the logistic curve right now.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [curveParams, decisionBoundary, selectedPoint]);

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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Logistic Regression"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LogisticRegressionAnalysis;