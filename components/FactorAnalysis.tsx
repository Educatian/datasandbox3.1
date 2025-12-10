import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SurveyItem, FactorAnalysisResult } from '../types';
import { SURVEY_ITEMS, generateFactorData, calculateFactorAnalysis } from '../services/statisticsService';
import { getFactorAnalysisExplanation } from '../services/geminiService';
import GeminiExplanation from './GeminiExplanation';
import FactorLoadingPlot from './FactorLoadingPlot';
import CorrelationHeatmap from './CorrelationHeatmap';

interface FactorAnalysisProps {
    onBack: () => void;
}

const FactorAnalysis: React.FC<FactorAnalysisProps> = ({ onBack }) => {
    const [allSurveyItems] = useState<SurveyItem[]>(SURVEY_ITEMS);
    const [rawData] = useState(() => generateFactorData(allSurveyItems, 200));
    
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => allSurveyItems.map(i => i.id));
    const [numFactors, setNumFactors] = useState(2);
    const [analysisResult, setAnalysisResult] = useState<FactorAnalysisResult | null>(null);

    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleItemToggle = (itemId: string) => {
        setSelectedItemIds(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    useEffect(() => {
        const result = calculateFactorAnalysis(rawData, selectedItemIds, numFactors);
        setAnalysisResult(result);
    }, [rawData, selectedItemIds, numFactors]);

    useEffect(() => {
        if (!analysisResult || analysisResult.loadings.length === 0) {
            setExplanation("Not enough data to perform analysis. Please select more items.");
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getFactorAnalysisExplanation(analysisResult.loadings, analysisResult.explainedVariance);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [analysisResult]);
    
    const totalVarianceExplained = useMemo(() => {
        if (!analysisResult) return 0;
        return analysisResult.explainedVariance.reduce((sum, v) => sum + v, 0) * 100;
    }, [analysisResult]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-violet-400 hover:text-violet-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-violet-400">Factor Analysis</h1>
                    <p className="text-slate-400 mt-2">Discover latent constructs by seeing how survey items group together.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <aside className="lg:col-span-1 bg-slate-800 p-6 rounded-lg shadow-lg space-y-6 self-start">
                    <div>
                        <h3 className="text-lg font-semibold text-violet-400 mb-3 border-b border-violet-400/20 pb-2">Controls</h3>
                        <label className="flex justify-between text-sm text-slate-400 mt-4">
                            <span>Number of Factors</span>
                            <span className="font-mono">{numFactors}</span>
                        </label>
                        <input type="range" min={2} max={3} step={1} value={numFactors} onChange={e => setNumFactors(+e.target.value)} className="w-full h-2 bg-slate-700 rounded-lg" />
                        <p className="text-xs text-slate-500 mt-1">Total Variance Explained: {totalVarianceExplained.toFixed(1)}%</p>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-violet-400 mb-3 border-b border-violet-400/20 pb-2">Survey Items</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {allSurveyItems.map(item => (
                                <label key={item.id} className="flex items-center space-x-3 p-2 bg-slate-900 rounded-md cursor-pointer hover:bg-slate-700">
                                    <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => handleItemToggle(item.id)} className="form-checkbox h-5 w-5 bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"/>
                                    <span className="text-slate-300 text-sm">{item.text} ({item.id.toUpperCase()})</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                </aside>
                <section className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 rounded-lg shadow-2xl p-4">
                        <h3 className="text-lg font-semibold text-center text-slate-300 mb-2">Factor Loadings Plot</h3>
                        {analysisResult && analysisResult.loadings.length > 0 && <FactorLoadingPlot loadings={analysisResult.loadings} explainedVariance={analysisResult.explainedVariance} factors={['factor1', 'factor2']} />}
                    </div>
                     <div className="bg-slate-800 rounded-lg shadow-2xl p-4">
                        <h3 className="text-lg font-semibold text-center text-slate-300 mb-2">Item Correlation Heatmap</h3>
                         {analysisResult && analysisResult.correlationMatrix.length > 0 && <CorrelationHeatmap matrix={analysisResult.correlationMatrix} labels={analysisResult.itemLabels} />}
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   When creating a survey to measure a concept like "student motivation," you might write 20 questions. Factor analysis helps validate your survey by showing if the questions you *think* measure motivation actually group together statistically. It can also reveal if your survey is unintentionally measuring multiple things, like "intrinsic motivation" and "extrinsic motivation," as separate factors.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default FactorAnalysis;