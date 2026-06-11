import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DecisionTreePoint, DecisionTreeNode } from '../types';
import { calculateDecisionTree } from '../services/statisticsService';
import DecisionTreeVisualizer from './DecisionTreeVisualizer';
import DecisionBoundaryPlot from './DecisionBoundaryPlot';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import ModuleShell from './ui/ModuleShell';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface DecisionTreeAnalysisProps {
    onBack: () => void;
}

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

    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can explain how this decision tree makes classifications. Click on any node, and I'll analyze the split logic for you!",
        () => `
            We are analyzing a Decision Tree Classifier.
            Hyperparameters: Max Depth=${maxDepth}, Min Samples Split=${minSamplesSplit}.
            Tree Nodes: ${tree ? 'Generated' : 'Pending'}.

            Explain how decision trees define boundaries to classify the data points (moons dataset).
        `
    );

    const regenerateData = useCallback(() => setData(generateMoonData(150)), []);

    useEffect(() => {
        const newTree = calculateDecisionTree(data, maxDepth, minSamplesSplit);
        setTree(newTree);
    }, [data, maxDepth, minSamplesSplit]);

    const handleNodeClick = useCallback((node: DecisionTreeNode) => {
        if (!node.splitFeatureIndex === undefined || node.splitThreshold === undefined) return;
        const msg = `What does the split at Feature ${node.splitFeatureIndex} <= ${node.splitThreshold.toFixed(2)} mean?`;
        sendMessage(msg);
    }, [sendMessage]);

    return (
        <ModuleShell
            title="Decision Tree Classifier"
            subtitle="Visualize how a tree learns to classify data by making splits."
            accentClass="text-rose-400"
            backClass="text-rose-400 hover:text-rose-300"
            maxWidthClass="max-w-7xl"
            onBack={onBack}
        >
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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Decision Tree Analysis"
                            history={chatHistory}
                            onSendMessage={sendMessage}
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

export default DecisionTreeAnalysis;
