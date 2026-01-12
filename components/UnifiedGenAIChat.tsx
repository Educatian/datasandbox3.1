import React, { useState, useEffect, useRef } from 'react';

// --- Types ---

export interface Message {
    role: 'user' | 'model';
    text: string;
}

interface UnifiedGenAIChatProps {
    moduleTitle: string;
    onboardingText?: string[]; // Bullet points for the overlay
    history: Message[];
    onSendMessage: (msg: string) => void;
    isLoading: boolean;
    className?: string;
    variant?: 'floating' | 'embedded'; // New prop
}

// --- Component ---

const UnifiedGenAIChat: React.FC<UnifiedGenAIChatProps> = ({
    moduleTitle,
    onboardingText = [
        "Ask about the statistical concept.",
        "Request a hint for the activity.",
        "Get feedback on your interpretation."
    ],
    history,
    onSendMessage,
    isLoading,
    className,
    variant = 'floating' // Default to floating
}) => {
    const [isOpen, setIsOpen] = useState(variant === 'embedded'); // Embedded is always open
    const [showOnboarding, setShowOnboarding] = useState(variant === 'floating'); // Onboarding for floating only
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isOpen]);

    // Handle Send
    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    // --- Render ---

    return (
        <>
            {/* 1. Onboarding Overlay (Floating Only) */}
            {variant === 'floating' && showOnboarding && (
                <div className="fixed inset-0 z-[60] flex items-end justify-end p-6 pointer-events-none">
                    <div className="pointer-events-auto bg-slate-900/95 border border-violet-500/50 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg text-white">
                                    🤖
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-cyan-400">Dr. Gem</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">AI LAB PARTNER</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowOnboarding(false)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-slate-300 text-sm mb-3">
                            I'm here to help you understand {moduleTitle}. Try asking:
                        </p>
                        <ul className="space-y-2 mb-6">
                            {onboardingText.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <span className="text-cyan-500 mt-1">•</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => { setShowOnboarding(false); setIsOpen(true); }}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20"
                        >
                            Open Chat
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Chat Button (Floating Only) */}
            {variant === 'floating' && (
                <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isOpen ? 'translate-y-[150%] opacity-0' : 'translate-y-0 opacity-100'}`}>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 transition-transform group border border-cyan-400/30"
                    >
                        <span className="text-2xl group-hover:animate-bounce">🤖</span>
                    </button>
                </div>
            )}

            {/* 3. Main Chat Interface */}
            {variant === 'floating' ? (
                // --- Floating Layout ---
                <div
                    className={`fixed bottom-0 right-4 z-50 w-full max-w-[400px] bg-slate-900/95 border-x border-t border-slate-700/50 rounded-t-2xl shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-y-0 h-[600px] max-h-[80vh]' : 'translate-y-full h-0'
                        } ${className}`}
                >
                    {renderChatContent(() => setIsOpen(false))}
                </div>
            ) : (
                // --- Embedded Layout ---
                // Default to h-[600px] unless a height class is provided in className
                <div className={`w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl flex flex-col ${className?.includes('h-') ? '' : 'h-[600px]'} ${className}`}>
                    {renderChatContent()}
                </div>
            )}
        </>
    );

    // Helper to render content to avoid duplication
    function renderChatContent(onClose?: () => void) {
        return (
            <>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b border-slate-700 ${variant === 'floating' ? 'bg-slate-900/95' : 'bg-slate-900'} rounded-t-2xl`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg text-white">
                            🤖
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100 text-sm leading-none">Dr. Gem</h3>
                            <p className="text-[10px] text-cyan-400 font-mono tracking-widest mt-1 uppercase">{moduleTitle}</p>
                        </div>
                    </div>
                    {onClose && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {history.length === 0 && (
                        <div className="text-center text-slate-500 text-sm mt-10">
                            <p>No messages yet.</p>
                            <p className="text-xs mt-2">Ask a question to get started!</p>
                        </div>
                    )}

                    {history.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 border border-slate-600 rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className={`p-4 border-t border-slate-800 ${variant === 'floating' ? 'bg-slate-900/50' : 'bg-transparent'}`}>
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Dr. Gem a question..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder-slate-500"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </>
        );
    }
};

export default UnifiedGenAIChat;
