import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LPAPoint, Profile } from '../types';
import { initializeLPA, expectationStep, maximizationStep } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import LPAScatterPlot from './LPAScatterPlot';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface LPAAnalysisProps {
    onBack: () => void;
}

const generateInitialData = (count: number): LPAPoint[] => {
    const data: LPAPoint[] = [];
    const centers = [[30, 65], [70, 35], [50, 50]];
    for (let i = 0; i < count; i++) {
        const center = centers[i % centers.length];
        const x = center[0] + (Math.random() - 0.5) * 40;
        const y = center[1] + (Math.random() - 0.5) * 40;
        data.push({ id: i, x, y, profileId: null, responsibilities: [] });
    }
    return data;
};

const LPAAnalysis: React.FC<LPAAnalysisProps> = ({ onBack }) => {
    const [k, setK] = useState(3);
    const [points, setPoints] = useState<LPAPoint[]>(() => generateInitialData(150));
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can help you uncover hidden subgroups (profiles) in this data using Latent Profile Analysis. Set the number of profiles and run the analysis!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const animationRef = useRef<number | null>(null);

    const resetSimulation = useCallback(() => {
        setIsAnimating(false);
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        setPoints(p => p.map(point => ({ ...point, profileId: null, responsibilities: [] })));
        setProfiles([]);
    }, []);

    const regenerateData = () => {
        setPoints(generateInitialData(150));
        resetSimulation();
    };

    const runStep = useCallback(() => {
        let currentProfiles = profiles;
        if (currentProfiles.length === 0) {
            currentProfiles = initializeLPA(points, k);
        }

        const pointsWithResponsibilities = expectationStep(points, currentProfiles);
        const newProfiles = maximizationStep(pointsWithResponsibilities, k);

        setPoints(pointsWithResponsibilities);
        setProfiles(newProfiles);
        return newProfiles;
    }, [points, profiles, k]);

    const animate = useCallback(() => {
        const newProfiles = runStep();
        const oldProfiles = profiles;

        let converged = true;
        if (oldProfiles.length === newProfiles.length) {
            for (let i = 0; i < newProfiles.length; i++) {
                const dx = newProfiles[i].mean[0] - oldProfiles[i].mean[0];
                const dy = newProfiles[i].mean[1] - oldProfiles[i].mean[1];
                if (dx * dx + dy * dy > 0.01) {
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
    }, [runStep, profiles]);

    const startAnimation = () => {
        setProfiles([]); // Reset profiles to re-initialize
        setIsAnimating(true);
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

        const context = `
            We are performing Latent Profile Analysis (LPA).
            Number of Profiles (K): ${k}
            Current Profiles Detected: ${profiles.length}
            Simulation Status: ${isAnimating ? 'Running' : 'Stopped'}
            
            User Question: ${msg}
            
            Explain how LPA identifies these hidden groups based on the data distribution.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the latent profiles right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [k, profiles, isAnimating]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-emerald-400">Latent Profile Analysis</h1>
                    <p className="text-slate-400 mt-2">Discover hidden subgroups in your data using Gaussian Mixture Models.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <LPAScatterPlot points={points} profiles={profiles} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Controls</h3>
                        <div>
                            <label className="flex justify-between text-sm text-slate-400">
                                <span>Number of Profiles (K)</span>
                                <span className="font-mono">{k}</span>
                            </label>
                            <input type="range" min={2} max={5} step={1} value={k} onChange={(e) => setK(+e.target.value)} className="w-full h-2 bg-slate-700 rounded-lg" />
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={startAnimation} disabled={isAnimating} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 p-2 rounded">Run Analysis</button>
                            <button onClick={() => setIsAnimating(false)} disabled={!isAnimating} className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 p-2 rounded">Pause</button>
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={regenerateData} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded">Regenerate Data</button>
                            <button onClick={resetSimulation} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded">Reset</button>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Latent Profile Analysis"
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

export default LPAAnalysis;

