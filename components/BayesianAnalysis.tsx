import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getChatResponse } from '../services/geminiService';
import ProbabilityDistributionChart from './ProbabilityDistributionChart';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface BayesianAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
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

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you understand Bayesian inference. Adjust your prior beliefs and add some data to see how your knowledge updates!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Posterior is calculated by adding observed data to the prior
    const posteriorParams = useMemo(() => ({
        alpha: priorParams.alpha + data.heads,
        beta: priorParams.beta + data.tails
    }), [priorParams, data]);

    const distributionsForChart = useMemo(() => [
        { ...priorParams, color: 'rgb(34 211 238)' },  // Prior (Cyan)
        { ...posteriorParams, color: 'rgb(163 230 53)' }, // Posterior (Lime)
    ], [priorParams, posteriorParams]);

    const handleAddData = (heads: number, tails: number) => {
        setData(d => ({ heads: d.heads + heads, tails: d.tails + tails }));
    };

    const resetData = () => {
        setData({ heads: 0, tails: 0 });
        setChatHistory(prev => [...prev, { text: "Data reset. Back to our prior belief.", sender: 'bot' }]);
    };

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are simulating Bayesian Inference (Beta-Binomial Conjugate Prior).
            Prior Belief (Cyan): Alpha=${priorParams.alpha}, Beta=${priorParams.beta}.
            Observed Data: ${data.heads} Heads, ${data.tails} Tails.
            Posterior Belief (Lime): Alpha=${posteriorParams.alpha}, Beta=${posteriorParams.beta}.
            
            User Question: ${msg}
            
            Explain how the prior and data combine to form the posterior belief.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the probability distributions.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [priorParams, data, posteriorParams]);

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
                                <Slider label="Prior Alpha (α)" value={priorParams.alpha} min={0.1} max={50} step={0.1} onChange={(e) => setPriorParams(p => ({ ...p, alpha: +e.target.value }))} />
                                <Slider label="Prior Beta (β)" value={priorParams.beta} min={0.1} max={50} step={0.1} onChange={(e) => setPriorParams(p => ({ ...p, beta: +e.target.value }))} />
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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Bayesian Inference"
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

export default BayesianAnalysis;