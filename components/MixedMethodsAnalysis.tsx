import React, { useState, useEffect, useCallback } from 'react';
import { Participant, QualitativeTheme } from '../types';
import { generateMixedMethodsData } from '../services/statisticsService';
import { getMixedMethodsInsight } from '../services/geminiService';
import QuantitativeBarChart from './QuantitativeBarChart';
import QualitativeThemeCloud from './QualitativeThemeCloud';
import GeminiExplanation from './GeminiExplanation';

interface MixedMethodsAnalysisProps {
    onBack: () => void;
}

const MixedMethodsAnalysis: React.FC<MixedMethodsAnalysisProps> = ({ onBack }) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [themes, setThemes] = useState<QualitativeTheme[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<QualitativeTheme | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const regenerateData = useCallback(() => {
        const { participants, themes } = generateMixedMethodsData(100);
        setParticipants(participants);
        setThemes(themes);
        setSelectedTheme(null);
        setExplanation("Click a theme in the word cloud to see how it connects to the quantitative survey scores.");
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const handleThemeSelect = useCallback((theme: QualitativeTheme | null) => {
        setSelectedTheme(theme);
    }, []);

    useEffect(() => {
        if (!selectedTheme) {
            setExplanation("Click a theme in the word cloud to see how it connects to the quantitative survey scores.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const fetchExplanation = async () => {
            const subgroup = participants.filter(p => p.themes.includes(selectedTheme.text));
            const exp = await getMixedMethodsInsight(selectedTheme, subgroup, participants);
            setExplanation(exp);
            setIsLoading(false);
        };

        const handler = setTimeout(fetchExplanation, 1500);
        return () => clearTimeout(handler);
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
                     <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   This method provides a richer understanding than either quantitative or qualitative data alone. For example, survey data (quantitative) might show that a new learning module has a low average satisfaction score. By analyzing interview data (qualitative), you might discover the key theme is 'Confusing Navigation.' Clicking this theme highlights that the dissatisfied students were precisely those who mentioned navigation issues, giving you a clear, actionable insight.
                                </p>
                            </div>
                        </div>
                    </div>
                 </div>
            </main>
        </div>
    );
};

export default MixedMethodsAnalysis;
