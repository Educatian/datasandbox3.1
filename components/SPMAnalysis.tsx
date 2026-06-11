import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentSequence, FrequentPattern, StudentAction } from '../types';
import { generateSequenceData, findFrequentPatterns } from '../services/statisticsService';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import ModuleShell from './ui/ModuleShell';
import { useGeminiChat } from '../hooks/useGeminiChat';
import { useTweenedNumber } from '../hooks/useTweenedNumber';

interface SPMAnalysisProps {
    onBack: () => void;
}

const actionMap: Record<StudentAction, { emoji: string; name: string }> = {
    V: { emoji: '▶️', name: 'Video' },
    Q: { emoji: '❓', name: 'Quiz' },
    A: { emoji: '📝', name: 'Assignment' },
    F: { emoji: '💬', name: 'Forum' },
    P: { emoji: '✅', name: 'Pass' },
    E: { emoji: '❌', name: 'Fail/Error' },
};

const SupportStat: React.FC<{ support: number }> = ({ support }) => {
    const tweenedSupport = useTweenedNumber(support * 100);
    return <span className="font-mono text-cyan-400">{tweenedSupport.toFixed(1)}%</span>;
};

const PatternList: React.FC<{ title: string; patterns: FrequentPattern[] }> = ({ title, patterns }) => (
    <div className="bg-slate-900 p-4 rounded-lg h-96 overflow-y-auto">
        <h4 className="text-lg font-semibold text-center text-slate-300 mb-4">{title}</h4>
        {patterns.length === 0 ? (
            <p className="text-slate-500 text-center mt-8">No patterns found with current settings.</p>
        ) : (
            <ul className="space-y-3">
                {patterns.map((p, i) => (
                    <li key={i} className="bg-slate-800 p-3 rounded-md flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {p.pattern.map((action, j) => (
                                <span key={j} title={actionMap[action].name} className="text-2xl">{actionMap[action].emoji}</span>
                            ))}
                        </div>
                        <div className="text-right">
                            <SupportStat support={p.support} />
                            <span className="text-xs text-slate-500 block">support</span>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const SPMAnalysis: React.FC<SPMAnalysisProps> = ({ onBack }) => {
    const [sequences, setSequences] = useState<StudentSequence[]>(() => generateSequenceData(100));
    const [support, setSupport] = useState(0.2);
    const [patternLength, setPatternLength] = useState(3);

    // Chat state
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can help you find frequent learning patterns. Compare Group A and Group B to see how their strategies differ!",
        () => `
            We are performing Sequential Pattern Mining (SPM).
            Minimum Support: ${(support * 100).toFixed(0)}%
            Pattern Length: ${patternLength}
            Found Patterns Group A: ${patternsA.length}
            Found Patterns Group B: ${patternsB.length}

            Compare the sequential patterns between the two groups and explain what they suggest about learning habits.
        `
    );

    const regenerateData = useCallback(() => setSequences(generateSequenceData(100)), []);

    const { patternsA, patternsB } = useMemo(() => {
        const sequencesA = sequences.filter(s => s.group === 'Group A');
        const sequencesB = sequences.filter(s => s.group === 'Group B');
        const patternsA = findFrequentPatterns(sequencesA, support, patternLength);
        const patternsB = findFrequentPatterns(sequencesB, support, patternLength);
        return { patternsA, patternsB };
    }, [sequences, support, patternLength]);

    return (
        <ModuleShell
            title="Sequential Pattern Mining"
            subtitle="Find frequent subsequences of actions, comparing between groups."
            accentClass="text-red-400"
            backClass="text-red-400 hover:text-red-300"
            onBack={onBack}
        >
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PatternList title="Group A (High-Achievers)" patterns={patternsA} />
                    <PatternList title="Group B (Low-Achievers)" patterns={patternsB} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Analysis Controls</h3>
                        <Slider label="Min Support Threshold" value={support} min={0.05} max={0.5} step={0.01} onChange={e => setSupport(+e.target.value)} format={v => `${(v * 100).toFixed(0)}%`} />
                        <Slider label="Pattern Length" value={patternLength} min={2} max={5} step={1} onChange={e => setPatternLength(+e.target.value)} />
                        <button onClick={regenerateData} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Regenerate Data</button>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Sequential Pattern Mining"
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

export default SPMAnalysis;
