import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LDAResult, Topic } from '../types';
import { calculateLda } from '../services/statisticsService';
import { getTopicModelingExplanation, getChatResponse } from '../services/geminiService';
import TopicKeywords from './TopicKeywords';
import DocumentViewer from './DocumentViewer';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface TopicModelingAnalysisProps {
    onBack: () => void;
}

const Slider: React.FC<{ label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, min, max, step, onChange }) => (
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

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you discover hidden themes in your text data. Try changing the number of topics to see how the grouping changes!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        const result = calculateLda(numTopics);
        setLdaResult(result);
        setSelectedTopicId(0); // Select the first topic by default
    }, [numTopics]);

    useEffect(() => {
        if (!ldaResult) return;

        // Auto-label topics using Gemini, but don't clear chat history or anything
        const fetchTopicLabels = async () => {
            try {
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

                // Optional: Add a small note to chat history that topics have been named (only once per unique set of topics?)
                // For now, we'll just let the UI reflect the new names.
            } catch (e) {
                console.error("Failed to label topics", e);
            }
        };

        const handler = setTimeout(fetchTopicLabels, 1000); // Small delay
        return () => clearTimeout(handler);

    }, [ldaResult?.topics.length]); // Re-run only when the number of topics changes

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const activeTopic = ldaResult?.topics[selectedTopicId || 0];
        const keywords = activeTopic?.keywords.map(k => k.text).join(', ');

        const context = `
            We are performing Topic Modeling (Latent Dirichlet Allocation).
            Number of Topics: ${numTopics}
            Currently Selected Topic: ${activeTopic?.name || 'Unknown'}
            Keywords for Selected Topic: ${keywords}
            
            User Question: ${msg}
            
            Explain how these keywords might represent a coherent theme in educational context.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the topics.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [numTopics, ldaResult, selectedTopicId]);

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

                    <div className="h-[400px]">
                        <UnifiedGenAIChat
                            moduleTitle="Topic Modeling"
                            history={chatHistory}
                            onSendMessage={handleSendMessage}
                            isLoading={isChatLoading}
                            variant="embedded"
                        />
                    </div>
                </div>
                <div className="lg:col-span-3 flex flex-col space-y-8">
                    {ldaResult && (
                        <DocumentViewer
                            documents={ldaResult.documents}
                            topics={ldaResult.topics}
                            selectedTopicId={selectedTopicId}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default TopicModelingAnalysis;