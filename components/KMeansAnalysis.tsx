import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KMeansPoint, Centroid } from '../types';
import { assignToClusters, updateCentroids, calculateKMeansInertia } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import { logEvent } from '../services/loggingService';
import KMeansPlot from './KMeansPlot';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface KMeansAnalysisProps {
    onBack: () => void;
}

const generateInitialData = (count: number): KMeansPoint[] => {
    const data: KMeansPoint[] = [];
    const centers = [[30, 30], [70, 70], [30, 70]];
    for (let i = 0; i < count; i++) {
        const center = centers[i % centers.length];
        const x = center[0] + (Math.random() - 0.5) * 30;
        const y = center[1] + (Math.random() - 0.5) * 30;
        data.push({ id: i, x, y, clusterId: null });
    }
    return data;
};

const KMeansAnalysis: React.FC<KMeansAnalysisProps> = ({ onBack }) => {
    const [k, setK] = useState(3);
    const [points, setPoints] = useState<KMeansPoint[]>(() => generateInitialData(100));
    const [centroids, setCentroids] = useState<Centroid[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. Set your initial centroids by clicking on the plot, then let the algorithm assist you in clustering the data!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const animationRef = useRef<number | null>(null);

    const resetSimulation = useCallback(() => {
        setIsAnimating(false);
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        setPoints(p => p.map(point => ({ ...point, clusterId: null })));
        setCentroids([]);
        logEvent('button_click', 'KMeansAnalysis', { action: 'reset_centroids' });
    }, []);

    const regenerateData = () => {
        setPoints(generateInitialData(100));
        resetSimulation();
        logEvent('button_click', 'KMeansAnalysis', { action: 'regenerate_data' });
    };

    const runStep = useCallback(() => {
        logEvent('button_click', 'KMeansAnalysis', { action: 'step' });
        const assignedPoints = assignToClusters(points, centroids);
        const newCentroids = updateCentroids(assignedPoints, k);
        setPoints(assignedPoints);
        setCentroids(newCentroids);
        return newCentroids;
    }, [points, centroids, k]);

    const animate = useCallback(() => {
        const newCentroids = runStep();
        const oldCentroids = centroids;

        let converged = true;
        if (oldCentroids.length === newCentroids.length) {
            for (let i = 0; i < newCentroids.length; i++) {
                if (Math.abs(newCentroids[i].x - oldCentroids[i].x) > 0.1 || Math.abs(newCentroids[i].y - oldCentroids[i].y) > 0.1) {
                    converged = false;
                    break;
                }
            }
        } else {
            converged = false;
        }

        if (converged) {
            setIsAnimating(false);
        } else {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [runStep, centroids]);

    const handlePlayPause = () => {
        logEvent('button_click', 'KMeansAnalysis', { action: isAnimating ? 'pause' : 'play' });
        setIsAnimating(!isAnimating);
    };

    const handleKChange = (newK: number) => {
        logEvent('slider_change', 'KMeansAnalysis', { control: 'K', value: newK });
        setK(newK);
    };

    const handleSetCentroid = (newCentroids: Centroid[]) => {
        const newCentroid = newCentroids[newCentroids.length - 1];
        logEvent('centroid_set', 'KMeansPlot', { count: newCentroids.length, x: newCentroid.x, y: newCentroid.y });
        setCentroids(newCentroids);
    };

    useEffect(() => {
        if (isAnimating) {
            animationRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        };
    }, [isAnimating, animate]);

    useEffect(() => {
        resetSimulation();
    }, [k, resetSimulation]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const inertia = calculateKMeansInertia(points, centroids);
        const context = `
            We are analyzing K-Means Clustering.
            Number of Clusters (K): ${k}
            Current Inertia (sum of squared distances): ${inertia.toFixed(2)}
            Simulation Status: ${isAnimating ? 'Running' : 'Stopped'}
            Centroids defined: ${centroids.length}
            
            User Question: ${msg}
            
            Explain the clustering process and what the inertia metric tells us.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the clusters right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [k, points, centroids, isAnimating]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-fuchsia-400 hover:text-fuchsia-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-fuchsia-400">K-Means Clustering</h1>
                    <p className="text-slate-400 mt-2">Watch how data points are grouped into clusters.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <KMeansPlot
                        points={points}
                        centroids={centroids}
                        k={k}
                        onCentroidsChange={handleSetCentroid}
                        isSettingInitial={centroids.length < k}
                    />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-fuchsia-400 mb-2">Controls</h3>
                        <div>
                            <label className="flex justify-between text-sm text-slate-400">
                                <span>Number of Clusters (K)</span>
                                <span className="font-mono">{k}</span>
                            </label>
                            <input type="range" min={2} max={6} step={1} value={k} onChange={(e) => handleKChange(+e.target.value)} className="w-full h-2 bg-slate-700 rounded-lg" />
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={handlePlayPause} disabled={centroids.length < k} className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-600 p-2 rounded">{isAnimating ? 'Pause' : 'Play'}</button>
                            <button onClick={runStep} disabled={isAnimating || centroids.length < k} className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 p-2 rounded">Step</button>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={regenerateData} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded">Regenerate Data</button>
                            <button onClick={resetSimulation} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded">Reset Centroids</button>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="K-Means Clustering"
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

export default KMeansAnalysis;

