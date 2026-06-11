import React, { useState, useEffect } from 'react';
import { IRTParams } from '../types';
import ICCChart from './ICCChart';
import UnifiedGenAIChat from './UnifiedGenAIChat';
import Slider from './ui/Slider';
import { useGeminiChat } from '../hooks/useGeminiChat';

interface IRTAnalysisProps {
    onBack: () => void;
}

const IRTAnalysis: React.FC<IRTAnalysisProps> = ({ onBack }) => {
    const [irtParams, setIrtParams] = useState<IRTParams>({
        discrimination: 1.0,
        difficulty: 0.0,
    });

    const { chatHistory, isChatLoading, sendMessage } = useGeminiChat(
        "Hello! I'm Dr. Gem. I can explain how item difficulty and discrimination affect student performance. Try moving the sliders to see the curve change!",
        () => `
            We are analyzing Item Response Theory (IRT).
            Item Parameters:
            Discrimination (a) = ${irtParams.discrimination.toFixed(2)}
            Difficulty (b) = ${irtParams.difficulty.toFixed(2)}

            Explain how these parameters shape the Item Characteristic Curve (ICC) and what that means for testing students.
        `
    );

    const handleParamChange = (param: keyof IRTParams, value: number) => {
        setIrtParams(prev => ({ ...prev, [param]: value }));
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-lime-400 hover:text-lime-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-lime-400">Item Response Theory (IRT)</h1>
                    <p className="text-slate-400 mt-2">Visualize how item characteristics influence the probability of a correct answer.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center p-4">
                    <ICCChart params={irtParams} />
                </div>
                <div className="lg:col-span-2 flex flex-col space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h3 className="text-lg font-semibold text-lime-400 mb-3 border-b border-lime-400/20 pb-2">Item Parameters</h3>
                        <Slider
                            label="Discrimination (a)"
                            value={irtParams.discrimination}
                            min={0.1}
                            max={5.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('discrimination', +e.target.value)}
                            format={(v) => v.toFixed(2)}
                        />
                        <Slider
                            label="Difficulty (b)"
                            value={irtParams.difficulty}
                            min={-3.0}
                            max={3.0}
                            step={0.1}
                            onChange={(e) => handleParamChange('difficulty', +e.target.value)}
                            format={(v) => v.toFixed(2)}
                        />
                    </div>

                    <div className="h-[500px]">
                        <UnifiedGenAIChat
                            moduleTitle="Item Response Theory"
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

export default IRTAnalysis;
