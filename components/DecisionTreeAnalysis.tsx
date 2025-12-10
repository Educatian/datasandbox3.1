import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DecisionTreePoint, DecisionTreeNode } from '../types';
import { calculateDecisionTree } from '../services/statisticsService';
import { getDecisionTreeNodeExplanation } from '../services/geminiService';
import DecisionTreeVisualizer from './DecisionTreeVisualizer';
import DecisionBoundaryPlot from './DecisionBoundaryPlot';
import GeminiExplanation from './GeminiExplanation';

interface DecisionTreeAnalysisProps {
    onBack: () => void;
}

// Reusable Slider component
const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const generateMoonData = (n_samples: number, noise: number = 0.2): DecisionTreePoint[] => {
    const data: DecisionTreePoint[] = [];
    const n_samples_out = Math.floor(n_samples / 2);
    const n_samples_in = n_samples - n_samples_out;

    for (let i = 0; i < n_samples_out; i++) {
        const angle = i / n_samples_out * Math.PI;
        const radius = 1;
        const x = radius * Math.cos(angle) + (Math.random() - 0.5) * noise * 2;
        const y = radius * Math.sin(angle) + (Math.random() - 0.5) * noise * 2;
        data.push({ id: i, features: [x, y], label: 0 });
    }

    for (let i = 0; i < n_samples_in; i++) {
        const angle = i / n_samples_in * Math.PI + Math.PI;
        const radius = 1;
        const x = radius * Math.cos(angle) + 1 + (Math.random() - 0.5) * noise * 2;
        const y = radius * Math.sin(angle) + 0.5 + (Math.random() - 0.5) * noise * 2;
        data.push({ id: i + n_samples_out, features: [x, y], label: 1 });
    }
    
    // Scale and shift data to be in a viewable range (e.g., 0-100)
    const allX = data.map(d => d.features[0]);
    const allY = data.map(d => d.features[1]);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);

    return data.map(d => ({
        ...d,
        features: [
            (d.features[0] - minX) / (maxX - minX) * 90 + 5,
            (d.features[1] - minY) / (maxY - minY) * 90 + 5,
        ]
    }));
};

const DecisionTreeAnalysis: React.FC<DecisionTreeAnalysisProps> = ({ onBack }) => {
    const [maxDepth, setMaxDepth] = useState(4);
    const [minSamplesSplit, setMinSamplesSplit] = useState(5);
    const [data, setData] = useState<DecisionTreePoint[]>(() => generateMoonData(150));
    const [tree, setTree] = useState<DecisionTreeNode | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const regenerateData = useCallback(() => setData(generateMoonData(150)), []);

    useEffect(() => {
        const newTree = calculateDecisionTree(data, maxDepth, minSamplesSplit);
        setTree(newTree);
        setExplanation("Adjust hyperparameters to see how the tree changes, or click a node for an explanation.");
    }, [data, maxDepth, minSamplesSplit]);

    const handleNodeClick = useCallback(async (node: DecisionTreeNode) => {
        if (!node.splitFeatureIndex === undefined || node.splitThreshold === undefined) return;
        setIsLoading(true);
        const exp = await getDecisionTreeNodeExplanation(node.splitFeatureIndex!, node.splitThreshold!);
        setExplanation(exp);
        setIsLoading(false);
    }, []);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-rose-400 hover:text-rose-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-rose-400">Decision Tree Classifier</h1>
                    <p className="text-slate-400 mt-2">Visualize how a tree learns to classify data by making splits.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-rose-400 mb-3 border-b border-rose-400/20 pb-2">Hyperparameters</h3>
                        <div className="space-y-4 mt-3">
                            <Slider label="Max Depth" value={maxDepth} min={1} max={10} step={1} onChange={(e) => setMaxDepth(+e.target.value)} />
                            <Slider label="Min Samples for Split" value={minSamplesSplit} min={2} max={20} step={1} onChange={(e) => setMinSamplesSplit(+e.target.value)} />
                        </div>
                        <button onClick={regenerateData} className="w-full mt-6 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-4 flex-grow">
                        <h3 className="text-lg font-semibold text-rose-400 text-center mb-2">Decision Boundary</h3>
                        {tree && <DecisionBoundaryPlot data={data} tree={tree} />}
                    </div>
                </div>
                 <div className="flex flex-col space-y-8">
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-4 flex-grow min-h-[400px]">
                        <h3 className="text-lg font-semibold text-rose-400 text-center mb-2">Tree Structure</h3>
                        {tree && <DecisionTreeVisualizer root={tree} onNodeClick={handleNodeClick} />}
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Imagine building a model to identify students at risk of failing a course. The tree learns rules from data, such as "IF weekly logins &lt; 2 AND quiz average &lt; 60% THEN predict 'at-risk'". The key benefit is interpretability; educators can see the exact rules the model uses, making it easier to trust its predictions and design targeted interventions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DecisionTreeAnalysis;