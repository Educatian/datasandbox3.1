import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MultimodalData, Bookmark } from '../types';
import { generateMultimodalData, findBookmarks } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import MultimodalDisplay from './MultimodalDisplay';
import MultimodalTimeline from './MultimodalTimeline';
import UnifiedGenAIChat, { ChatMessage } from './UnifiedGenAIChat';

interface MultimodalAnalysisProps {
    onBack: () => void;
}

const MultimodalAnalysis: React.FC<MultimodalAnalysisProps> = ({ onBack }) => {
    const [data, setData] = useState<MultimodalData | null>(null);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Hello! I'm Dr. Gem. I can help you analyze the synchronized video, speech, and eye-tracking traces. Click on a bookmark to explore specific events!", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const regenerateData = useCallback(() => {
        const newData = generateMultimodalData(60);
        setData(newData);
        const newBookmarks = findBookmarks(newData);
        setBookmarks(newBookmarks);
        setCurrentTime(0);
        setIsPlaying(false);
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);

    const animate = useCallback((timestamp: number) => {
        if (lastTimeRef.current === null) {
            lastTimeRef.current = timestamp;
        }
        const deltaTime = (timestamp - lastTimeRef.current) / 1000; // in seconds
        lastTimeRef.current = timestamp;

        setCurrentTime(prevTime => {
            const newTime = prevTime + deltaTime;
            if (data && newTime >= data.duration) {
                setIsPlaying(false);
                return data.duration;
            }
            return newTime;
        });

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [data]);

    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = null;
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, animate]);

    const handleBookmarkClick = useCallback(async (bookmark: Bookmark) => {
        setCurrentTime(bookmark.time);

        // Auto-send a message for the bookmark
        setIsChatLoading(true);
        const msg = `What is happening at ${bookmark.time.toFixed(1)}s?`;
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are looking at a Multimodal Analysis of a learning session.
            Bookmark Time: ${bookmark.time.toFixed(1)}s
            Event Type: ${bookmark.type}
            Description: ${bookmark.description}
            
            User Question: ${msg}
            
            Explain the significance of this event in the context of collaborative learning.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing this event right now.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, []);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);

        const context = `
            We are analyzing synchronized multimodal data (speech, gaze, clicks).
            Current Time: ${currentTime.toFixed(1)}s
            
            User Question: ${msg}
            
            Explain the potential connection between gaze patterns and speech at this moment.
        `;

        try {
            const response = await getChatResponse(context);
            setChatHistory(prev => [...prev, { text: response, sender: 'bot' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the multimodal stream.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [currentTime]);

    if (!data) {
        return <div>Loading...</div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-indigo-400">Multimodal Analysis Dashboard</h1>
                    <p className="text-slate-400 mt-2">Analyze synchronized video, speech, gaze, and click data from a collaborative session.</p>
                </div>
            </header>

            <main className="flex flex-col space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-800 rounded-lg shadow-2xl p-4">
                        <MultimodalDisplay gazeData={data.gaze} currentTime={currentTime} />
                    </div>
                    <div className="flex flex-col space-y-8">
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold text-indigo-400 mb-3">Controls</h3>
                            <div className="flex space-x-2">
                                <button onClick={() => setIsPlaying(!isPlaying)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 p-2 rounded">{isPlaying ? 'Pause' : 'Play'}</button>
                                <button onClick={regenerateData} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded">Regenerate Data</button>
                            </div>
                        </div>

                        <div className="h-[500px]">
                            <UnifiedGenAIChat
                                moduleTitle="Multimodal Analysis"
                                history={chatHistory}
                                onSendMessage={handleSendMessage}
                                isLoading={isChatLoading}
                                variant="embedded"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 rounded-lg shadow-2xl p-4">
                    <MultimodalTimeline
                        data={data}
                        bookmarks={bookmarks}
                        currentTime={currentTime}
                        onTimeChange={setCurrentTime}
                        onBookmarkClick={handleBookmarkClick}
                    />
                </div>
            </main>
        </div>
    );
};

export default MultimodalAnalysis;
