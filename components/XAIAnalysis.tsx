import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentFeatures, PredictionResult } from '../types';
import { calculateXaiPrediction } from '../services/statisticsService';
import { getXAIExplanation } from '../services/geminiService';
import PredictionGauge from './PredictionGauge';
import ContributionBars from './ContributionBars';
import GeminiExplanation from './GeminiExplanation';

interface XAIAnalysisProps {
    onBack: () => void;
}

const initialFeatures: StudentFeatures = {
    assignmentCompletion: 75,
    quizScores: 80,
    forumParticipation: 60,
    absences: 20,
    procrastination: 30,
};

const FeatureSlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </label>
        <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const XAIAnalysis: React.FC<XAIAnalysisProps> = ({ onBack }) => {
    const [features, setFeatures] = useState<StudentFeatures>(initialFeatures);
    const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const handleFeatureChange = useCallback((feature: keyof StudentFeatures, value: number) => {
        setFeatures(prev => ({...prev, [feature]: value }));
    }, []);

    useEffect(() => {
        const result = calculateXaiPrediction(features);
        setPredictionResult(result);
    }, [features]);

    useEffect(() => {
        if (!predictionResult) return;
        setIsLoading(true);
        const handler = setTimeout(async () => {
            const exp = await getXAIExplanation(predictionResult);
            setExplanation(exp);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(handler);
    }, [predictionResult]);
    
    const { positiveContributions, negativeContributions } = useMemo(() => {
        if (!predictionResult) return { positiveContributions: [], negativeContributions: [] };
        return {
            positiveContributions: predictionResult.contributions.filter(c => c.value > 0).sort((a,b) => b.value - a.value),
            negativeContributions: predictionResult.contributions.filter(c => c.value < 0).sort((a,b) => a.value - b.value)
        };
    }, [predictionResult]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-blue-400">XAI for Prediction</h1>
                    <p className="text-slate-400 mt-2">See how an AI model arrives at its prediction for a student's success.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                     <h3 className="text-lg font-semibold text-blue-400 mb-2">Student Profile</h3>
                    <FeatureSlider label="Assignment Completion" value={features.assignmentCompletion} onChange={v => handleFeatureChange('assignmentCompletion', v)} />
                    <FeatureSlider label="Quiz Scores" value={features.quizScores} onChange={v => handleFeatureChange('quizScores', v)} />
                    <FeatureSlider label="Forum Participation" value={features.forumParticipation} onChange={v => handleFeatureChange('forumParticipation', v)} />
                    <FeatureSlider label="Absences" value={features.absences} onChange={v => handleFeatureChange('absences', v)} />
                    <FeatureSlider label="Procrastination" value={features.procrastination} onChange={v => handleFeatureChange('procrastination', v)} />
                </div>
                <div className="flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
                         <h3 className="text-lg font-semibold text-blue-400 mb-4">Predicted Probability of Success</h3>
                        {predictionResult && <PredictionGauge prediction={predictionResult.prediction} baseValue={predictionResult.baseValue} />}
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-lg font-semibold text-blue-400 mb-4 text-center">Prediction Factors</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <ContributionBars title="Positive Factors (+)" contributions={positiveContributions} color="rgb(34 197 94)" />
                            <ContributionBars title="Negative Factors (-)" contributions={negativeContributions} color="rgb(239 68 68)" />
                        </div>
                    </div>
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    This module is crucial for building trust in AI-driven educational tools. Instead of just telling a teacher a student is 'at-risk,' XAI explains *why*—e.g., 'due to low assignment completion and high absences, despite good quiz scores.' This allows educators to provide highly specific, personalized feedback and interventions, turning a black-box prediction into actionable educational insights.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default XAIAnalysis;