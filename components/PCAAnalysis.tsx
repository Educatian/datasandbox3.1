import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PCA3DPoint, PCAResult } from '../types';
import { calculatePCA } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import PCAVisualizer from './PCAVisualizer';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';
import ModuleShell from './ui/ModuleShell';
import { useTweenedNumber } from '../hooks/useTweenedNumber';

interface PCAAnalysisProps {
    onBack: () => void;
}

const generateEllipsoidData = (count: number): PCA3DPoint[] => {
    const data: PCA3DPoint[] = [];
    for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        let x = 45 * Math.sin(phi) * Math.cos(theta);
        let y = 25 * Math.sin(phi) * Math.sin(theta);
        let z = 10 * Math.cos(phi);

        // Add some noise
        x += (Math.random() - 0.5) * 10;
        y += (Math.random() - 0.5) * 10;
        z += (Math.random() - 0.5) * 10;

        data.push({ id: i, x, y, z });
    }
    return data;
};

const PCAAnalysis: React.FC<PCAAnalysisProps> = ({ onBack }) => {
    const [data3D, setData3D] = useState<PCA3DPoint[]>(() => generateEllipsoidData(200));
    const [pcaResult, setPcaResult] = useState<PCAResult | null>(null);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can help you understand Principal Component Analysis. I can explain how we simplify 3D data into 2D while keeping the most important information!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const regenerateData = useCallback(() => setData3D(generateEllipsoidData(200)), []);

    useEffect(() => {
        const result = calculatePCA(data3D);
        setPcaResult(result);
    }, [data3D]);

    const explainedVariance = useMemo(() => {
        if (!pcaResult) return { pc1: 0, pc2: 0, total: 0 };
        const pc1 = pcaResult.explainedVarianceRatio[0] * 100;
        const pc2 = pcaResult.explainedVarianceRatio[1] * 100;
        return { pc1, pc2, total: pc1 + pc2 };
    }, [pcaResult]);

    const tweenedPc1 = useTweenedNumber(explainedVariance.pc1);
    const tweenedPc2 = useTweenedNumber(explainedVariance.pc2);
    const tweenedTotal = useTweenedNumber(explainedVariance.total);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are performing Principal Component Analysis (PCA).
            First Component Explained Variance: ${explainedVariance.pc1.toFixed(1)}%
            Second Component Explained Variance: ${explainedVariance.pc2.toFixed(1)}%
            Total Variance Explained (in 2D): ${explainedVariance.total.toFixed(1)}%
            
            User Question: ${msg}
            
            Explain what these principal components represent and why dimensionality reduction is useful.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the principal components right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [explainedVariance]);

    return (
        <ModuleShell
            title="Principal Component Analysis (PCA)"
            subtitle="Reduce 3D data to its most important 2D representation."
            accentClass="text-violet-400"
            backClass="text-violet-400 hover:text-violet-300"
            maxWidthClass="max-w-7xl"
            onBack={onBack}
        >
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4 min-h-[500px]">
                    <PCAVisualizer data3D={data3D} pcaResult={pcaResult} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-violet-400 mb-3">Explained Variance</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Principal Component 1:</span>
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded">{tweenedPc1.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Principal Component 2:</span>
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded">{tweenedPc2.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                                <span className="text-slate-300 font-bold">Total (in 2D):</span>
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded font-bold">{tweenedTotal.toFixed(1)}%</span>
                            </div>
                        </div>
                        <button onClick={regenerateData} className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Principal Component Analysis"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                            className="h-full"
                        />
                    </div>
                </div>
            </main>
        </ModuleShell>
    );
};

export default PCAAnalysis;
