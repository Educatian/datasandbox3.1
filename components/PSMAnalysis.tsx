import React, { useState, useEffect, useCallback } from 'react';
import { PSMDataPoint } from '../types';
import { generatePSMData, performMatching } from '../services/statisticsService';
import PSMComparisonPlot from './PSMComparisonPlot';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface PSMAnalysisProps {
    onBack: () => void;
}

const PSMAnalysis: React.FC<PSMAnalysisProps> = ({ onBack }) => {
    const [selectionBias, setSelectionBias] = useState(15);
    const [data, setData] = useState<PSMDataPoint[]>([]);
    const [isMatched, setIsMatched] = useState(false);

    // Chat state
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can help you understand Propensity Score Matching. Try adjusting the selection bias and then perform matching to see the effect!",
        () => `
            We are simulating Propensity Score Matching (PSM).
            Selection Bias Level: ${selectionBias} (higher means Treatment group has higher natural propensity scores).
            Status: ${isMatched ? 'Matched' : 'Unmatched raw data'}.
            Total Participants: ${data.length}.

            Explain how matching helps to reduce bias and allow for fairer comparisons between the groups.
        `
    );

    const regenerateData = useCallback(() => {
        const newData = generatePSMData(150, selectionBias);
        setData(newData);
        setIsMatched(false);
    }, [selectionBias]);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const handleMatch = () => {
        const matchedData = performMatching(data);
        setData(matchedData);
        setIsMatched(true);
    };

    const handleReset = () => {
        setIsMatched(false);
        setData(prevData => prevData.map(p => ({ ...p, isMatched: false, matchedWithId: null })));
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-green-400 hover:text-green-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-green-400">Propensity Score Matching</h1>
                    <p className="text-slate-400 mt-2">Visually balance two groups to create a fair comparison.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4 min-h-[500px]">
                    <PSMComparisonPlot data={data} isMatched={isMatched} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-green-400 mb-3">Simulation Controls</h3>
                        <Slider
                            label="Selection Bias"
                            value={selectionBias}
                            min={0} max={40} step={1}
                            onChange={(e) => setSelectionBias(+e.target.value)}
                            format={(v) => `+${v.toFixed(0)} score advantage`}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={handleMatch} disabled={isMatched} className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 p-2 rounded">Perform Matching</button>
                            <button onClick={handleReset} disabled={!isMatched} className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 p-2 rounded">Reset Matches</button>
                        </div>
                        <button onClick={regenerateData} className="w-full mt-3 bg-slate-700 hover:bg-slate-600 p-2 rounded">Regenerate Data</button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Propensity Score Matching"
                            history={chatHistory}
                            onSendMessage={sendMessage}
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

export default PSMAnalysis;
