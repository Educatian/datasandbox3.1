import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LPAPoint, Profile } from '../types';
import { initializeLPA, expectationStep, maximizationStep } from '../services/statisticsService';
import { getLPAExplanation } from '../services/geminiService';
import LPAScatterPlot from './LPAScatterPlot';
import GeminiExplanation from './GeminiExplanation';

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
    const [explanation, setExplanation] = useState<string | null>("Set the number of profiles and press 'Run Analysis'.");
    const [isLoading, setIsLoading] = useState(false);
    const animationRef = useRef<number | null>(null);

    const resetSimulation = useCallback(() => {
        setIsAnimating(false);
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        setPoints(p => p.map(point => ({ ...point, profileId: null, responsibilities: [] })));
        setProfiles([]);
        setExplanation("Set the number of profiles and press 'Run Analysis'.");
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
            for(let i=0; i<newProfiles.length; i++) {
                const dx = newProfiles[i].mean[0] - oldProfiles[i].mean[0];
                const dy = newProfiles[i].mean[1] - oldProfiles[i].mean[1];
                if(dx*dx + dy*dy > 0.01) {
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

    useEffect(() => {
        if (!isAnimating && profiles.length > 0) {
            const fetchExplanation = async () => {
                setIsLoading(true);
                const exp = await getLPAExplanation(k);
                setExplanation(exp);
                setIsLoading(false);
            };
            fetchExplanation();
        }
    }, [isAnimating, profiles, k]);


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
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Imagine you have data on students' weekly study hours and their final exam scores. LPA can help you identify if there are natural groupings, such as "High-Effort, High-Achievers", "Low-Effort, Low-Achievers", and perhaps an unexpected "Efficient Learners" group (low hours, high scores). This is more nuanced than simple clustering as it models the shape and density of each group.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LPAAnalysis;
