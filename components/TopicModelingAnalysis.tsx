import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LDAResult, Topic } from '../types';
import { calculateLda } from '../services/statisticsService';
import { getTopicModelingExplanation } from '../services/geminiService';
import GeminiExplanation from './GeminiExplanation';
import TopicKeywords from './TopicKeywords';
import DocumentViewer from './DocumentViewer';

interface TopicModelingAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, min, max, step, onChange }) => (
    <div>
        <label className="flex justify-between text-sm text-slate-400">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </label>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);


const TopicModelingAnalysis: React.FC<TopicModelingAnalysisProps> = ({ onBack }) => {
    const [numTopics, setNumTopics] = useState(3);
    const [ldaResult, setLdaResult] = useState<LDAResult | null>(null);
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const result = calculateLda(numTopics);
        setLdaResult(result);
        setSelectedTopicId(0); // Select the first topic by default
    }, [numTopics]);

    useEffect(() => {
        if (!ldaResult) return;

        setIsLoading(true);
        const fetchExplanation = async () => {
            const topicNamesText = await getTopicModelingExplanation(ldaResult.topics);
            const topicNames = topicNamesText.split('\n').map(line => {
                const parts = line.split(': ');
                return parts.length > 1 ? parts[1].trim() : 'Unnamed Topic';
            });

            setLdaResult(prevResult => {
                if (!prevResult) return null;
                const newTopics = prevResult.topics.map((topic, i) => ({
                    ...topic,
                    name: topicNames[i] || `Topic ${i + 1}`
                }));
                return { ...prevResult, topics: newTopics };
            });

            setExplanation("Gemini has assigned a name to each topic. Click a topic to explore related documents.");
            setIsLoading(false);
        };
        
        const handler = setTimeout(fetchExplanation, 1500);
        return () => clearTimeout(handler);

    }, [ldaResult?.topics.length]); // Re-run only when the number of topics changes

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-orange-400 hover:text-orange-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-orange-400">Topic Modeling (LDA)</h1>
                    <p className="text-slate-400 mt-2">Discover hidden themes in text data by adjusting the number of topics.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 flex flex-col space-y-8 self-start">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-orange-400 mb-2">Controls</h3>
                        <Slider label="Number of Topics (K)" value={numTopics} min={2} max={5} step={1} onChange={(e) => setNumTopics(+e.target.value)} />
                    </div>
                     {ldaResult && (
                        <TopicKeywords
                            topics={ldaResult.topics}
                            selectedTopicId={selectedTopicId}
                            onTopicSelect={setSelectedTopicId}
                        />
                     )}
                </div>
                <div className="lg:col-span-3 flex flex-col space-y-8">
                    {ldaResult && (
                         <DocumentViewer
                            documents={ldaResult.documents}
                            topics={ldaResult.topics}
                            selectedTopicId={selectedTopicId}
                        />
                    )}
                    <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                        <div className="flex items-start space-x-4 w-full">
                            <div className="text-3xl">🎓</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                   Imagine analyzing thousands of student responses to an open-ended question like "What was the most confusing part of this chapter?". Topic modeling can automatically group these responses into themes like 'difficulty with equations,' 'unclear definitions,' or 'lack of examples.' This allows instructors to quickly identify and address common points of confusion at scale without reading every single response.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TopicModelingAnalysis;