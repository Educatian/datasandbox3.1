import React, { useState, useEffect, useCallback } from 'react';
import { Participant, QualitativeTheme } from '../types';
import { generateMixedMethodsData } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import QuantitativeBarChart from './QuantitativeBarChart';
import QualitativeThemeCloud from './QualitativeThemeCloud';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

interface MixedMethodsAnalysisProps {
    onBack: () => void;
}

const MixedMethodsAnalysis: React.FC<MixedMethodsAnalysisProps> = ({ onBack }) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [themes, setThemes] = useState<QualitativeTheme[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<QualitativeTheme | null>(null);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can explain how these qualitative themes explain the quantitative trends. Select a theme to get started!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const regenerateData = useCallback(() => {
        const { participants, themes } = generateMixedMethodsData(100);
        setParticipants(participants);
        setThemes(themes);
        setSelectedTheme(null);
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const handleThemeSelect = useCallback((theme: QualitativeTheme | null) => {
        setSelectedTheme(theme);
    }, []);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const subgroup = selectedTheme ? participants.filter(p => p.themes.includes(selectedTheme.text)) : [];
        const avgScore = subgroup.length > 0 ? subgroup.reduce((acc, p) => acc + p.surveyScore, 0) / subgroup.length : 0;

        const context = `
            We are performing Mixed Methods Analysis.
            Selected Theme: ${selectedTheme ? selectedTheme.text : 'None'}
            Participants with this theme: ${subgroup.length}
            Average score for this group: ${avgScore.toFixed(2)}
            
            User Question: ${msg}
            
            Synthesize the qualitative theme with the quantitative scores to provide a mixed-methods insight.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble synthesizing the data right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [selectedTheme, participants]);

    const subgroupData = selectedTheme
        ? participants.filter(p => p.themes.includes(selectedTheme.text))
        : null;

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-rose-400 hover:text-rose-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-rose-400">Mixed Methods Analysis</h1>
                    <p className="text-slate-400 mt-2">Integrate quantitative survey data with qualitative interview themes.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 rounded-lg shadow-2xl p-4">
                    <h3 className="text-lg font-semibold text-center text-slate-300 mb-2">Quantitative: Survey Scores</h3>
                    <QuantitativeBarChart allData={participants} subgroupData={subgroupData} />
                </div>
                <div className="bg-slate-800 rounded-lg shadow-2xl p-4">
                    <h3 className="text-lg font-semibold text-center text-slate-300 mb-2">Qualitative: Interview Themes</h3>
                    <QualitativeThemeCloud
                        themes={themes}
                        selectedTheme={selectedTheme}
                        onThemeSelect={handleThemeSelect}
                    />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <button onClick={regenerateData} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg">
                        Regenerate Data
                    </button>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Mixed Methods Analysis"
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

export default MixedMethodsAnalysis;

