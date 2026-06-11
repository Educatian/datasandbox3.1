import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SurvivalDataPoint, SurvivalCurvePoint } from '../types';
import { generateSurvivalData, calculateKaplanMeier } from '../services/statisticsService';
import SurvivalCurveChart from './SurvivalCurveChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface SurvivalAnalysisProps {
    onBack: () => void;
}

const SurvivalAnalysis: React.FC<SurvivalAnalysisProps> = ({ onBack }) => {
    const [interventionEffect, setInterventionEffect] = useState(0.5);
    const [survivalData, setSurvivalData] = useState<SurvivalDataPoint[]>([]);

    // Chat state
    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can help interpret these survival curves. Adjust the mentoring effect to see how it changes student retention over time!",
        () => `
            We are performing Survival Analysis (Kaplan-Meier Estimator).
            Group A (Mentored) Median Survival Time: ${medianSurvivalA} weeks.
            Group B (Control) Median Survival Time: ${medianSurvivalB} weeks.
            Intervention Effect Setting: ${(interventionEffect * 100).toFixed(0)}% risk reduction.

            Explain the difference in the curves and what it implies about the effectiveness of the mentoring program on student retention.
        `
    );

    const regenerateData = useCallback(() => {
        const data = generateSurvivalData(200, interventionEffect);
        setSurvivalData(data);
    }, [interventionEffect]);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const { curveA, curveB, medianSurvivalA, medianSurvivalB } = useMemo(() => {
        const dataA = survivalData.filter(d => d.group === 'Group A');
        const dataB = survivalData.filter(d => d.group === 'Group B');
        const curveA = calculateKaplanMeier(dataA);
        const curveB = calculateKaplanMeier(dataB);

        const findMedianSurvival = (curve: SurvivalCurvePoint[]) => {
            const point = curve.find(p => p.survivalProbability <= 0.5);
            return point ? point.time.toFixed(1) : '>20';
        };

        return {
            curveA,
            curveB,
            medianSurvivalA: findMedianSurvival(curveA),
            medianSurvivalB: findMedianSurvival(curveB),
        };
    }, [survivalData]);


    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-teal-400 hover:text-teal-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-teal-400">Survival Analysis</h1>
                    <p className="text-slate-400 mt-2">Compare student dropout curves between a mentored group and a control group.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <SurvivalCurveChart curves={[
                        { name: 'Group A (Mentored)', data: curveA, color: 'rgb(34 211 238)' },
                        { name: 'Group B (Control)', data: curveB, color: 'rgb(236 72 153)' }
                    ]} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-teal-400 mb-3">Controls</h3>
                        <Slider
                            label="Mentoring Program Effect"
                            value={interventionEffect}
                            min={0} max={0.9} step={0.05}
                            onChange={(e) => setInterventionEffect(+e.target.value)}
                            format={v => `${(v * 100).toFixed(0)}% reduction in dropout risk`}
                        />
                        <button onClick={regenerateData} className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg">
                            Regenerate Data
                        </button>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-teal-400 mb-3">Analysis Results</h3>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">Median Survival (Group A):</span>
                            <span className="font-mono bg-slate-900 px-2 py-1 rounded">{medianSurvivalA} weeks</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-slate-300">Median Survival (Group B):</span>
                            <span className="font-mono bg-slate-900 px-2 py-1 rounded">{medianSurvivalB} weeks</span>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Survival Analysis"
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

export default SurvivalAnalysis;
