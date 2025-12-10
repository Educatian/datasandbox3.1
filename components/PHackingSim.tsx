
import React, { useState } from 'react';
import AITutor, { ChatMessage } from './AITutor';
import { getChatResponse } from '../services/geminiService';

interface PHackingSimProps {
    onBack: () => void;
}

interface Experiment {
    id: number;
    name: string;
    pValue: number;
    significant: boolean;
}

const JELLY_BEANS = [
    'Purple', 'Brown', 'Pink', 'Blue', 'Teal', 'Salmon', 'Red', 'Turquoise', 'Magenta', 'Yellow',
    'Grey', 'Tan', 'Cyan', 'Green', 'Mauve', 'Beige', 'Lilac', 'Black', 'Peach', 'Orange'
];

const PHackingSim: React.FC<PHackingSimProps> = ({ onBack }) => {
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    
    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Welcome to The P-Hacking Lab! 🕵️‍♂️", sender: 'bot' },
        { text: "We are testing if Jelly Beans cause acne. We found no link overall. But maybe a SPECIFIC color does? Click 'Run 20 Studies' to check every color.", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    const runSim = () => {
        const results = JELLY_BEANS.map((color, i) => {
            // Generate random p-value (Uniform distribution 0-1 under Null Hypothesis)
            const p = Math.random();
            return {
                id: i,
                name: `${color} Jelly Beans`,
                pValue: p,
                significant: p < 0.05
            };
        });
        setExperiments(results);
        
        const sigCount = results.filter(r => r.significant).length;
        if (sigCount > 0) {
            const sigNames = results.filter(r => r.significant).map(r => r.name).join(', ');
            setTimeout(() => addBotMessage(`Omg! We found a link! ${sigNames} are linked to acne (p < 0.05). Publish the paper! (Wait... is this real?)`), 500);
        } else {
            setTimeout(() => addBotMessage(`No significant results this time. Try running it again. Eventually, we'll get lucky.`), 500);
        }
    };

    const addBotMessage = (text: string) => {
        setChatHistory(prev => [...prev, { text, sender: 'bot' }]);
    };

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);
        setIsChatLoading(true);
        const context = `Dr. Gem explaining P-Hacking. 
        Running 20 tests at alpha=0.05 means we EXPECT 1 false positive by chance (Type I Error). 
        Cherry-picking that one result is bad science.`;
        
        try {
            const res = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: res, sender: 'bot' }]);
        } catch {
            setChatHistory(prev => [...prev, { text: "Error.", sender: 'bot' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            <header className="mb-8">
                <button onClick={onBack} className="text-pink-400 hover:text-pink-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-pink-400">The P-Hacking Fisher</h1>
                    <p className="text-slate-400 mt-2">Why doing 20 tests guarantees a "Significant" result by mistake.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-6">
                    <button onClick={runSim} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-lg mb-6 shadow-lg transform active:scale-95 transition-all">
                        RUN 20 RANDOM EXPERIMENTS
                    </button>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {experiments.map(exp => (
                            <div key={exp.id} className={`p-3 rounded border-2 flex flex-col items-center justify-center text-center transition-all duration-500 ${exp.significant ? 'bg-green-900/50 border-green-500 scale-105 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
                                <div className="font-bold text-sm text-slate-300">{exp.name}</div>
                                <div className="text-xs text-slate-500 mt-1">vs. Acne</div>
                                <div className={`text-lg font-mono mt-2 ${exp.significant ? 'text-green-400 font-bold' : 'text-slate-500'}`}>
                                    p={exp.pValue.toFixed(3)}
                                </div>
                                {exp.significant && <div className="text-xs text-green-400 font-bold mt-1">SIGNIFICANT!</div>}
                            </div>
                        ))}
                        {experiments.length === 0 && <div className="col-span-full text-center text-slate-500 py-20 italic">No experiments run yet. Start fishing!</div>}
                    </div>
                </div>

                <div className="lg:col-span-1 h-[600px]">
                    <AITutor 
                        history={chatHistory}
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        className="h-full"
                        suggestedActions={[
                            { label: "Why is this bad?", action: () => handleSendMessage("Why is running 20 tests bad?") },
                            { label: "What is Type I Error?", action: () => handleSendMessage("What is a Type I error?") },
                        ]}
                    />
                </div>
            </main>
        </div>
    );
};

export default PHackingSim;
