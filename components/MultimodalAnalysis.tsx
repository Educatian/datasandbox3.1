import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MultimodalData, Bookmark } from '../types';
import { generateMultimodalData, findBookmarks } from '../services/statisticsService';
import { getMultimodalEventExplanation } from '../services/geminiService';
import MultimodalDisplay from './MultimodalDisplay';
import MultimodalTimeline from './MultimodalTimeline';
import GeminiExplanation from './GeminiExplanation';

interface MultimodalAnalysisProps {
    onBack: () => void;
}

const MultimodalAnalysis: React.FC<MultimodalAnalysisProps> = ({ onBack }) => {
    const [data, setData] = useState<MultimodalData | null>(null);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const regenerateData = useCallback(() => {
        const newData = generateMultimodalData(60);
        setData(newData);
        const newBookmarks = findBookmarks(newData);
        setBookmarks(newBookmarks);
        setCurrentTime(0);
        setIsPlaying(false);
        setExplanation("Press Play to start the simulation, or click the timeline to explore.");
        setIsLoading(false);
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
        setIsLoading(true);
        const exp = await getMultimodalEventExplanation(bookmark);
        setExplanation(exp);
        setIsLoading(false);
    }, []);

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
                        <GeminiExplanation explanation={explanation} isLoading={isLoading} />
                        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
                            <div className="flex items-start space-x-4 w-full">
                                <div className="text-3xl">🎓</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-teal-400 mb-2">Context for Learning Sciences</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        This dashboard simulates the analysis of rich data from collaborative problem-solving. By synchronizing what students say (speech), where they look (gaze), and what they do (clicks), researchers can uncover the micro-processes of learning. For example, a bookmark might highlight where one student's explanation leads to a shared gaze focus and a correct action, indicating successful knowledge co-construction.
                                    </p>
                                </div>
                            </div>
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
