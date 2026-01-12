import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentFeatures, PredictionResult } from '../types';
import { calculateXaiPrediction } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import PredictionGauge from './PredictionGauge';
import ContributionBars from './ContributionBars';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';

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

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can explain why the AI predicts this student's success probability. Try changing the student's profile to see how the factors change!", role: 'model' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const handleFeatureChange = useCallback((feature: keyof StudentFeatures, value: number) => {
        setFeatures(prev => ({ ...prev, [feature]: value }));
    }, []);

    useEffect(() => {
        const result = calculateXaiPrediction(features);
        setPredictionResult(result);
    }, [features]);

    const { positiveContributions, negativeContributions } = useMemo(() => {
        if (!predictionResult) return { positiveContributions: [], negativeContributions: [] };
        return {
            positiveContributions: predictionResult.contributions.filter(c => c.value > 0).sort((a, b) => b.value - a.value),
            negativeContributions: predictionResult.contributions.filter(c => c.value < 0).sort((a, b) => a.value - b.value)
        };
    }, [predictionResult]);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const topPositive = positiveContributions.slice(0, 2).map(c => c.feature).join(', ');
        const topNegative = negativeContributions.slice(0, 2).map(c => c.feature).join(', ');

        const context = `
            We are performing Explainable AI (XAI) analysis on a student success prediction model (SHAP-like values).
            Current Predicted Probability: ${(predictionResult?.prediction || 0).toFixed(0)}%
            Top Positive Factors: ${topPositive}
            Top Negative Factors: ${topNegative}
            
            Student Profile:
            - Assignment Completion: ${features.assignmentCompletion}
            - Quiz Scores: ${features.quizScores}
            - Absences: ${features.absences}
            
            User Question: ${msg}
            
            Explain *why* the model made this prediction based on the factors.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the prediction factors.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [predictionResult, features, positiveContributions, negativeContributions]);

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

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="XAI Analysis"
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

export default XAIAnalysis;
