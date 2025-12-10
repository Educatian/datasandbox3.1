import React, { useState, useEffect, useMemo } from 'react';
import { getBayesianExplanation } from '../services/geminiService';
import ProbabilityDistributionChart from './ProbabilityDistributionChart';
import GeminiExplanation from './GeminiExplanation';

interface BayesianAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(1)}</span>
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

const BayesianAnalysis: React.FC<BayesianAnalysisProps> = ({ onBack }) => {
    // Prior parameters (Beta distribution: Alpha, Beta)
    const [priorParams, setPriorParams] = useState({ alpha: 2.0, beta: 2.0 });
    // Observed data (counts of heads and tails)
    const [data, setData] = useState({ heads: 0, tails: 0 });
    
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [lastDataUpdate, setLastDataUpdate] = useState({ heads: 0, tails: 0 });

    // Posterior is calculated by adding observed data to the prior
    const posteriorParams = useMemo(() => ({
        alpha: priorParams.alpha + data.heads,
        beta: priorParams.beta + data.tails
    }), [priorParams, data]);

    const distributionsForChart = useMemo(() => [
        { ...priorParams, color: 'rgb(34 211 238)' },  // Prior (Cyan)
        { ...posteriorParams, color: 'rgb(163 230 53)' }, // Posterior (Lime)
    ], [priorParams, posteriorParams]);

    // Fetch explanation only when data changes
    useEffect(() => {
        // Don't fetch on initial load or if only the prior changes
        if (data.heads === 0 && data.tails === 0) {
            setIsLoading(false);
            setExplanation("Adjust the prior sliders to shape your initial belief, then add data to see how it updates.");
            return;
        }

        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getBayesianExplanation(
                priorParams.alpha,
                priorParams.beta,
                lastDataUpdate.heads,
                lastDataUpdate.tails
            );
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(handler);
    }, [data, priorParams]); // Re-fetch if prior changes after data has been added

    const handleAddData = (heads: number, tails: number) => {
        setData(d => ({ heads: d.heads + heads, tails: d.tails + tails }));
        setLastDataUpdate({ heads, tails }); // Track the most recent addition for the prompt
    };
    
    const resetData = () => {
        setData({ heads: 0, tails: 0 });
        setLastDataUpdate({ heads: 0, tails: 0 });
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-purple-400 hover:text-purple-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-purple-400">Bayesian Inference</h1>
                    <p className="text-slate-400 mt-2">Update your beliefs about a coin's fairness with new evidence.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <ProbabilityDistributionChart distributions={distributionsForChart} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-cyan-400 mb-3 border-b border-cyan-400/20 pb-2">Prior Belief (Cyan)</h3>
                            <p className="text-xs text-slate-400 mb-3">Shape your initial belief about the coin's probability of landing heads. (Alpha ≈ prior heads, Beta ≈ prior tails)</p>
                            <div className="space-y-4 mt-3">
                                <Slider label="Prior Alpha (α)" value={priorParams.alpha} min={0.1} max={50} step={0.1} onChange={(e) => setPriorParams(p => ({...p, alpha: +e.target.value}))} />
                                <Slider label="Prior Beta (β)" value={priorParams.beta} min={0.1} max={50} step={0.1} onChange={(e) => setPriorParams(p => ({...p, beta: +e.target.value}))} />
                            </div>
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold text-lime-400 mb-3 border-b border-lime-400/20 pb-2">Evidence & Posterior (Lime)</h3>
                             <p className="text-sm text-slate-300 mb-3">Data: <span className="font-mono">{data.heads} Heads</span>, <span className="font-mono">{data.tails} Tails</span></p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleAddData(1, 0)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">+1 Head</button>
                                <button onClick={() => handleAddData(0, 1)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">+1 Tail</button>
                                <button onClick={() => handleAddData(10, 0)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">+10 Heads</button>
                                <button onClick={() => handleAddData(0, 10)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg">+10 Tails</button>
                            </div>
                             <button onClick={resetData} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200">Reset Data</button>
                        </div>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    This directly models the core of an adaptive learning system. The 'prior' is the system's current belief about a student's mastery of a topic (e.g., "probability"). Each time the student answers a question ('evidence'), the system updates its belief, creating a 'posterior'. This allows the system to personalize the next question, choosing one that is not too hard and not too easy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BayesianAnalysis;