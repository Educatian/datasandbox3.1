
import React, { useRef, useEffect } from 'react';
import { logChat } from '../services/loggingService';

export interface ChatMessage {
    text: string;
    sender: 'bot' | 'user';
}

interface AITutorProps {
    history: ChatMessage[];
    onSendMessage: (msg: string) => void;
    isLoading: boolean;
    suggestedActions?: { label: string; action: () => void; }[];
    title?: string;
    subtitle?: string;
    className?: string;
}

const AITutor: React.FC<AITutorProps> = ({ 
    history, 
    onSendMessage, 
    isLoading, 
    suggestedActions = [],
    title = "Dr. Gem", 
    subtitle = "AI LAB PARTNER",
    className = ""
}) => {
    const [input, setInput] = React.useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevHistoryLength = useRef(0);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isLoading]);

    // Log new chat messages
    useEffect(() => {
        if (history.length > prevHistoryLength.current) {
            // Log only the new messages added since last render
            for (let i = prevHistoryLength.current; i < history.length; i++) {
                const msg = history[i];
                logChat(msg.sender, msg.text);
            }
            prevHistoryLength.current = history.length;
        }
    }, [history]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div className={`flex flex-col bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg text-white">
                        🤖
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
                </div>
                <div>
                    <h3 className="font-bold text-slate-100 leading-none">{title}</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-widest mt-1 uppercase">{subtitle}</p>
                </div>
            </div>

            {/* Chat History */}
            <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-800/50 scroll-smooth">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                            msg.sender === 'user' 
                                ? 'bg-cyan-700 text-white rounded-br-sm' 
                                : 'bg-slate-700 text-slate-200 rounded-bl-sm border border-slate-600'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 p-4 rounded-2xl rounded-bl-sm border border-slate-600 flex space-x-1 items-center">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
                {suggestedActions.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {suggestedActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={action.action}
                                className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-full text-xs hover:bg-slate-700 hover:border-cyan-500/50 hover:text-cyan-300 whitespace-nowrap transition-all text-slate-400 font-mono"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or ask a question..." 
                        className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all font-mono"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg font-bold transition-all shadow-lg active:scale-95"
                    >
                        ➤
                    </button>
                </div>
            </div>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default AITutor;
