import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MultimodalData, Bookmark } from '../types';
import { generateMultimodalData, findBookmarks } from '../services/statisticsService';
import { getChatResponse } from '../services/geminiService';
import MultimodalDisplay from './MultimodalDisplay';
import MultimodalTimeline from './MultimodalTimeline';
import UnifiedGenAIChat, { Message } from './UnifiedGenAIChat';
import ModuleShell from './ui/ModuleShell';

interface MultimodalAnalysisProps {
    onBack: () => void;
}

const MultimodalAnalysis: React.FC<MultimodalAnalysisProps> = ({ onBack }) => {
    const [data, setData] = useState<MultimodalData | null>(null);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Chat state
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { text: "Hello! I'm Dr. Gem. I can help you analyze the synchronized video, speech, and eye-tracking traces. Click on a bookmark to explore specific events!", role: 'model' }
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
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are looking at a Multimodal Analysis of a learning session.
            Bookmark Time: ${bookmark.time.toFixed(1)}s
            Event Type: ${bookmark.type}
            Description: ${bookmark.description}
            
            User Question: ${msg}
            
            Explain the significance of this event in the context of collaborative learning.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing this event right now.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, []);

    const handleSendMessage = useCallback(async (msg: string) => {
        setIsChatLoading(true);
        setChatHistory(prev => [...prev, { text: msg, role: 'user' }]);

        const context = `
            We are analyzing synchronized multimodal data (speech, gaze, clicks).
            Current Time: ${currentTime.toFixed(1)}s
            
            User Question: ${msg}
            
            Explain the potential connection between gaze patterns and speech at this moment.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "I'm having trouble analyzing the multimodal stream.", role: 'model' }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [currentTime]);

    if (!data) {
        return <div>Loading...</div>;
    }

    return (
        <ModuleShell
            title="Multimodal Analysis Dashboard"
            subtitle="Analyze synchronized video, speech, gaze, and click data from a collaborative session."
            accentClass="text-indigo-400"
            backClass="text-indigo-400 hover:text-indigo-300"
            maxWidthClass="max-w-7xl"
            onBack={onBack}
        >
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
                                className="h-full"
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
        </ModuleShell>
    );
};

export default MultimodalAnalysis;

