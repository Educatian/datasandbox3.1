import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PCA3DPoint, PCAResult } from '../types';
import { calculatePCA } from '../services/statisticsService';
import { getPCAExplanation } from '../services/geminiService';
import PCAVisualizer from './PCAVisualizer';
import GeminiExplanation from './GeminiExplanation';

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
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    const regenerateData = useCallback(() => setData3D(generateEllipsoidData(200)), []);

    useEffect(() => {
        const result = calculatePCA(data3D);
        setPcaResult(result);
        setShowExplanation(false);
    }, [data3D]);
    
    const fetchExplanation = useCallback(async () => {
        setIsLoading(true);
        setShowExplanation(true);
        const exp = await getPCAExplanation();
        setExplanation(exp);
        setIsLoading(false);
    }, []);

    const explainedVariance = useMemo(() => {
        if (!pcaResult) return { pc1: 0, pc2: 0, total: 0 };
        const pc1 = pcaResult.explainedVarianceRatio[0] * 100;
        const pc2 = pcaResult.explainedVarianceRatio[1] * 100;
        return { pc1, pc2, total: pc1 + pc2 };
    }, [pcaResult]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-violet-400 hover:text-violet-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-violet-400">Principal Component Analysis (PCA)</h1>
                    <p className="text-slate-400 mt-2">Reduce 3D data to its most important 2D representation.</p>
                </div>
            </header>

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
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded">{explainedVariance.pc1.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Principal Component 2:</span>
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded">{explainedVariance.pc2.toFixed(1)}%</span>
                            </div>
                             <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                                <span className="text-slate-300 font-bold">Total (in 2D):</span>
                                <span className="font-mono bg-slate-900 px-2 py-1 rounded font-bold">{explainedVariance.total.toFixed(1)}%</span>
                            </div>
                        </div>
                         <button onClick={regenerateData} className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>
                    {showExplanation && <GeminiExplanation explanation={explanation} isLoading={isLoading} />}
                    <div className="bg-slate-800 p-4 rounded-lg shadow-lg text-center text-sm">
                        <p className="text-slate-400">Why is PCA useful?</p>
                        <button onClick={fetchExplanation} className="text-violet-400 hover:underline">Ask Gemini</button>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Your learning platform tracks dozens of engagement metrics: clicks, time-on-page, forum posts, video plays, quiz attempts, etc. This is too much to easily interpret. PCA can distill these many variables into a few key "principal components," such as a general "Active Engagement" score and a "Social Participation" score. This simplifies complex data for visualization and analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PCAAnalysis;