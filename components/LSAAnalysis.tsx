import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentSequence, StudentAction } from '../types';
import { generateSequenceData, calculateLagSequentialAnalysis } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import TransitionGraph from './TransitionGraph';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface LSAAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </label>
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
    </div>
);

const ALL_ACTIONS: StudentAction[] = ['V', 'Q', 'A', 'F', 'P', 'E'];

const LSAAnalysis: React.FC<LSAAnalysisProps> = ({ onBack }) => {
    const [sequences, setSequences] = useState<StudentSequence[]>(() => generateSequenceData(100));
    const [lag, setLag] = useState(1);

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you analyze learning behaviors using Lag Sequential Analysis. Adjust the lag to see how actions influence subsequent behaviors!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const regenerateData = useCallback(() => setSequences(generateSequenceData(100)), []);

    const { resultA, resultB } = useMemo(() => {
        const sequencesA = sequences.filter(s => s.group === 'Group A');
        const sequencesB = sequences.filter(s => s.group === 'Group B');
        const resultA = calculateLagSequentialAnalysis(sequencesA, lag);
        const resultB = calculateLagSequentialAnalysis(sequencesB, lag);
        return { resultA, resultB };
    }, [sequences, lag]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are performing Lag Sequential Analysis (LSA).
            Current Lag: ${lag}
            Comparing Group A (High-Achievers) vs Group B (Low-Achievers).
            Available Actions: Video(V), Quiz(Q), Answer(A), Forum(F), Pass(P), Error(E).
            
            User Question: ${msg}
            
            Explain the significant transitions found in the graphs and what they imply about learning strategies.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the sequential patterns right now.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [lag]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-blue-400">Lag Sequential Analysis</h1>
                    <p className="text-slate-400 mt-2">Analyze and compare behavioral transition graphs between two groups.</p>
                </div>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <TransitionGraph title="Group A (High-Achievers)" result={resultA} actions={ALL_ACTIONS} />
                    <TransitionGraph title="Group B (Low-Achievers)" result={resultB} actions={ALL_ACTIONS} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">Analysis Controls</h3>
                        <Slider label="Lag" value={lag} min={1} max={3} step={1} onChange={e => setLag(+e.target.value)} />
                        <button onClick={regenerateData} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Regenerate Data</button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Lag Sequential Analysis"
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

export default LSAAnalysis;