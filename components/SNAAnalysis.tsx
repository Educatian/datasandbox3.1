import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Interaction, SNANode, SNALink } from '../types';
import { generateSNAData, processSNAData } from '../services/statisticsService';
import { getSNAExplanation } from '../services/geminiService';
import SNAGraph from './SNAGraph';
import GeminiExplanation from './GeminiExplanation';

interface SNAAnalysisProps {
    onBack: () => void;
}

const NUM_STUDENTS = 15;
const NUM_INTERACTIONS = 50;

const SNAAnalysis: React.FC<SNAAnalysisProps> = ({ onBack }) => {
    const [allInteractions, setAllInteractions] = useState<Interaction[]>([]);
    const [time, setTime] = useState(0);
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const animationRef = useRef<number | null>(null);

    const regenerateData = useCallback(() => {
        const data = generateSNAData(NUM_STUDENTS, NUM_INTERACTIONS);
        setAllInteractions(data);
        setTime(0);
        setIsAnimating(false);
    }, []);

    useEffect(() => {
        regenerateData();
    }, [regenerateData]);
    
    const { visibleNodes, visibleLinks, allNodes } = useMemo(() => {
        const visibleInteractions = allInteractions.slice(0, time + 1);
        const { nodes, links } = processSNAData(visibleInteractions);
        const allNodeData = processSNAData(allInteractions).nodes;
        return { visibleNodes: nodes, visibleLinks: links, allNodes: allNodeData };
    }, [allInteractions, time]);


    const animate = useCallback(() => {
        setTime(t => {
            if (t >= allInteractions.length - 1) {
                setIsAnimating(false);
                return t;
            }
            return t + 1;
        });
        animationRef.current = requestAnimationFrame(animate);
    }, [allInteractions.length]);

    useEffect(() => {
        if (isAnimating) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isAnimating, animate]);
    
    useEffect(() => {
        if (time >= allInteractions.length - 1 && allInteractions.length > 0) {
             const fetchExplanation = async () => {
                setIsLoading(true);
                const exp = await getSNAExplanation(allNodes);
                setExplanation(exp);
                setIsLoading(false);
            };
            fetchExplanation();
        } else {
            setExplanation("Play the animation or move the slider to see the network form.");
            setIsLoading(false);
        }
    }, [time, allInteractions, allNodes]);

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-sky-400 hover:text-sky-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-sky-400">Social Network Analysis</h1>
                    <p className="text-slate-400 mt-2">Watch a social network form over time and identify key actors.</p>
                </div>
            </header>
            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl p-4">
                    <SNAGraph nodes={visibleNodes} links={visibleLinks} selectedNodeId={selectedNodeId} onNodeClick={setSelectedNodeId} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                     <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
                        <h3 className="text-lg font-semibold text-sky-400 mb-2">Controls</h3>
                         <div>
                            <label className="flex justify-between text-sm text-slate-400">
                                <span>Time / Interaction Step</span>
                                <span className="font-mono">{allInteractions.length > 0 ? time + 1 : 0} / {allInteractions.length}</span>
                            </label>
                            <input type="range" min={0} max={allInteractions.length > 0 ? allInteractions.length - 1 : 0} value={time} onChange={(e) => setTime(+e.target.value)} className="w-full h-2 bg-slate-700 rounded-lg" />
                        </div>
                        <div className="flex space-x-2">
                            <button onClick={() => setIsAnimating(!isAnimating)} className="flex-1 bg-sky-600 hover:bg-sky-700 p-2 rounded">{isAnimating ? 'Pause' : 'Play'}</button>
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
                                    In a collaborative online course, who talks to whom? SNA visualizes these interactions from discussion forums. It can identify "central" students who act as knowledge hubs, "brokers" who connect different groups, and "isolated" students who may need extra support. Clicking a student highlights their direct network.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SNAAnalysis;
