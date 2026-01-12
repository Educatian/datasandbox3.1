import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getChatResponse } from '../services/geminiService';
import UnifiedGenAIChat from './UnifiedGenAIChat';

interface DataSorterGameProps {
    onBack: () => void;
}

type MeasurementScale = 'nominal' | 'ordinal' | 'interval' | 'ratio';

interface DataItem {
    text: string;
    type: MeasurementScale;
    hint: string;
}

// --- Game Data Themes ---
const THEMES: Record<string, DataItem[]> = {
    general: [
        { text: "Eye Color", type: "nominal", hint: "Just categories (Blue, Brown). No math possible." },
        { text: "Zip Code", type: "nominal", hint: "Numbers used as labels. 90210 isn't 'more' than 10001." },
        { text: "Car Brand", type: "nominal", hint: "Toyota vs Ford. Just names." },
        { text: "Race Position", type: "ordinal", hint: "1st, 2nd, 3rd. We know who beat whom, but not by how much." },
        { text: "Survey (1-5)", type: "ordinal", hint: "Agree vs Strongly Agree. The gap isn't strictly measurable." },
        { text: "Rank", type: "ordinal", hint: "General > Colonel, but the 'difference' is abstract." },
        { text: "Temp (°C)", type: "interval", hint: "0°C is freezing, not 'no heat'. Zero is arbitrary." },
        { text: "Temp (°F)", type: "interval", hint: "0°F is cold, but heat still exists. No true zero." },
        { text: "Year", type: "interval", hint: "Time has no start point (Year 0 is arbitrary)." },
        { text: "Height", type: "ratio", hint: "0 cm means no height exists. You can be twice as tall." },
        { text: "Weight", type: "ratio", hint: "0 kg is absence of weight. Ratio comparisons work." },
        { text: "Money ($)", type: "ratio", hint: "0 dollars means you're broke! True zero." }
    ],
    science: [
        { text: "pH Level", type: "interval", hint: "Logarithmic scale. 0 is acidic, not 'no acidity'." },
        { text: "Kelvin", type: "ratio", hint: "0K is absolute zero (no energy). Ratios work." },
        { text: "Species", type: "nominal", hint: "Homo Sapiens, Canis Lupus. Names only." },
        { text: "Mohs Hardness", type: "ordinal", hint: "Diamond (10) > Talc (1). Intervals aren't equal." },
        { text: "Blood Type", type: "nominal", hint: "A, B, AB, O. No order." },
        { text: "Reaction Rate", type: "ratio", hint: "Molarity/sec. Can be 0." }
    ],
    sports: [
        { text: "Jersey #", type: "nominal", hint: "Player 23 isn't 'better' than Player 10 by math." },
        { text: "Medal", type: "ordinal", hint: "Gold, Silver, Bronze. Order matters." },
        { text: "Score", type: "ratio", hint: "0 points is the baseline. 20 is double 10." },
        { text: "Team Name", type: "nominal", hint: "Lakers vs Bulls." },
        { text: "Seeding", type: "ordinal", hint: "1st seed, 2nd seed." }
    ]
};

const DataSorterGame: React.FC<DataSorterGameProps> = ({ onBack }) => {
    // Refs for DOM interaction
    const capsuleRef = useRef<HTMLDivElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const basketsRef = useRef<HTMLDivElement>(null);
    const toastRef = useRef<HTMLDivElement>(null);
    const toastTimeoutRef = useRef<number | null>(null);

    // Game Logic State
    const [score, setScore] = useState(0);
    const [currentTheme, setCurrentTheme] = useState('general');
    const [deck, setDeck] = useState<DataItem[]>([]);
    const [currentItem, setCurrentItem] = useState<DataItem | null>(null);

    // Dragging State
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [capsulePos, setCapsulePos] = useState({ x: 0, y: 0 }); // Visual position in px relative to center
    const [isResetting, setIsResetting] = useState(false);

    // Chat State
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
        { role: 'model', text: "Welcome to the Data Sorter! I'm Dr. Gem. 🦾\n\n**Your Task:** Drag the floating data capsule and drop it into the correct measurement scale category below (Nominal, Ordinal, Interval, or Ratio).\n\nNeed a hint? Just ask me! You can also type 'theme science' or 'theme sports' to change the dataset." }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Initialize Deck
    useEffect(() => {
        setDeck([...THEMES.general]);
        spawnNext([...THEMES.general]);
    }, []);

    const spawnNext = useCallback((currentDeck: DataItem[]) => {
        if (currentDeck.length === 0) {
            // Refill if empty
            const refill = THEMES[currentTheme] || THEMES.general;
            currentDeck = [...refill];
        }
        const randomIndex = Math.floor(Math.random() * currentDeck.length);
        setCurrentItem(currentDeck[randomIndex]);
        setDeck(currentDeck);

        // Reset visual position
        setCapsulePos({ x: 0, y: 0 });
        setIsResetting(true);
        setTimeout(() => setIsResetting(false), 300);
    }, [currentTheme]);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'error') => {
        if (toastRef.current) {
            toastRef.current.innerHTML = msg;
            toastRef.current.style.opacity = '1';
            toastRef.current.style.borderColor = type === 'success' ? '#a6e3a1' : '#f38ba8';
            toastRef.current.style.color = type === 'success' ? '#a6e3a1' : '#f38ba8';

            if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);

            toastTimeoutRef.current = window.setTimeout(() => {
                if (toastRef.current) toastRef.current.style.opacity = '0';
            }, type === 'success' ? 1500 : 3500);
        }
    }, []);

    // --- Interaction Logic ---

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isResetting) return;
        isDragging.current = true;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        // Start position is always relative to the center origin (0,0) of the capsule container
        dragOffset.current = {
            x: clientX - capsulePos.x,
            y: clientY - capsulePos.y
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging.current) return;
        e.preventDefault(); // Prevent scrolling on touch

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        setCapsulePos({
            x: clientX - dragOffset.current.x,
            y: clientY - dragOffset.current.y
        });
    }, []);

    const checkDrop = useCallback(() => {
        if (!capsuleRef.current || !currentItem || !basketsRef.current) return;

        const capsuleRect = capsuleRef.current.getBoundingClientRect();
        const baskets = Array.from(basketsRef.current.children) as HTMLElement[];

        let droppedTarget: MeasurementScale | null = null;

        const capsuleCenter = {
            x: capsuleRect.left + capsuleRect.width / 2,
            y: capsuleRect.top + capsuleRect.height / 2
        };

        for (const basket of baskets) {
            const rect = basket.getBoundingClientRect();
            if (
                capsuleCenter.x >= rect.left &&
                capsuleCenter.x <= rect.right &&
                capsuleCenter.y >= rect.top &&
                capsuleCenter.y <= rect.bottom
            ) {
                droppedTarget = basket.getAttribute('data-type') as MeasurementScale;
                break;
            }
        }

        if (droppedTarget) {
            if (droppedTarget === currentItem.type) {
                setScore(s => s + 10);
                showToast(`Correct! It is <b>${currentItem.type.toUpperCase()}</b>. +10 pts`, 'success');
                if (gameContainerRef.current) {
                    gameContainerRef.current.classList.add('correct-flash');
                    setTimeout(() => gameContainerRef.current?.classList.remove('correct-flash'), 300);
                }
                spawnNext(deck);
            } else {
                showToast(`Incorrect! <b>${currentItem.text}</b> is NOT ${droppedTarget}.<br/><span style="font-size:0.8em; color: white;">Hint: ${currentItem.hint}</span>`, 'error');
                setCapsulePos({ x: 0, y: 0 }); // Snap back
                setIsResetting(true);
                setTimeout(() => setIsResetting(false), 300);
            }
        } else {
            setCapsulePos({ x: 0, y: 0 });
            setIsResetting(true);
            setTimeout(() => setIsResetting(false), 300);
        }
    }, [currentItem, deck, spawnNext, showToast]);

    const handleMouseUp = useCallback(() => {
        if (isDragging.current) {
            isDragging.current = false;
            checkDrop();
        }
    }, [checkDrop]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    // --- Chat Logic ---

    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, role: 'user' as const }]);

        // Quick local command check
        const lowerCmd = msg.toLowerCase().trim();
        if (lowerCmd.startsWith('theme')) {
            const themeName = lowerCmd.split(' ')[1];
            if (THEMES[themeName]) {
                setCurrentTheme(themeName);
                setDeck([...THEMES[themeName]]);
                spawnNext([...THEMES[themeName]]);
                setTimeout(() => setChatHistory(prev => [...prev, { text: `Theme switched to '${themeName}'. Ready!`, role: 'model' as const }]), 500);
                return;
            }
        }

        setIsChatLoading(true);
        const context = `
            You are Dr. Gem, an intelligent data science tutor.
            Current Activity: Data Sorting Game.
            Current Theme: ${currentTheme}
            Current Item: ${currentItem ? currentItem.text : 'None'} (${currentItem ? currentItem.type : 'N/A'}).
            Instructions: Provide a hint or explaining the concept of Nominal, Ordinal, Interval, or Ratio scales.
        `;

        try {
            const response = await getChatResponse(msg, context);
            setChatHistory(prev => [...prev, { text: response, role: 'model' as const }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { text: "Connection error.", role: 'model' as const }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="w-full h-screen max-h-screen flex flex-col bg-[#1e1e2e] text-[#cdd6f4] overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-[#181825] p-4 flex justify-between items-center border-b border-[#313244] z-50">
                <button onClick={onBack} className="text-[#89b4fa] hover:text-white flex items-center gap-2">
                    <span>&larr;</span> Exit Simulation
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">Data Sorter Sandbox</h1>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">Protocol: {currentTheme}</span>
                </div>
                <div className="w-32 text-right font-mono text-[#a6e3a1]">Score: {score}</div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: Game Area */}
                <div
                    ref={gameContainerRef}
                    className="flex-[7] relative flex flex-col justify-end border-r-2 border-[#181825] overflow-hidden select-none bg-slate-900"
                    style={{ background: 'radial-gradient(circle at center, #2b2b3d 0%, #1e1e2e 100%)' }}
                >
                    <div ref={toastRef} className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#181825] px-8 py-4 rounded-xl text-white font-bold text-center border border-[#89b4fa] transition-opacity duration-300 opacity-0 z-50 pointer-events-none shadow-2xl"></div>

                    {/* Drag Area / Staging - positioned higher to avoid overlap with baskets */}
                    <div className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none">
                        {currentItem && (
                            <div
                                ref={capsuleRef}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleMouseDown}
                                className={`absolute w-40 h-40 rounded-2xl bg-white text-[#1e1e2e] flex flex-col items-center justify-center text-center font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] z-20 border-4 border-white p-4 cursor-grab active:cursor-grabbing pointer-events-auto transition-transform ${isResetting ? 'duration-300 ease-out' : 'duration-0'}`}
                                style={{ transform: `translate(${capsulePos.x}px, ${capsulePos.y}px) rotate(${capsulePos.x * 0.05}deg)` }}
                            >
                                <span className="text-xs text-slate-400 uppercase mb-2 tracking-widest">Data Point</span>
                                <span className="text-lg leading-tight">{currentItem.text}</span>
                                <div className="mt-2 w-8 h-1 bg-slate-200 rounded-full"></div>
                            </div>
                        )}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] font-bold text-white/5 select-none pointer-events-none">?</div>
                    </div>

                    {/* Baskets */}
                    <div ref={basketsRef} className="h-[180px] w-full flex gap-4 p-4 z-10">
                        {['nominal', 'ordinal', 'interval', 'ratio'].map((type) => (
                            <div
                                key={type}
                                data-type={type}
                                className={`flex-1 flex flex-col items-center justify-center rounded-t-2xl border-t-4 bg-[#1e1e2e]/50 backdrop-blur-sm transition-all hover:bg-[#313244]/50`}
                                style={{
                                    borderColor: type === 'nominal' ? '#f38ba8' : type === 'ordinal' ? '#fab387' : type === 'interval' ? '#89b4fa' : '#cba6f7',
                                    color: type === 'nominal' ? '#f38ba8' : type === 'ordinal' ? '#fab387' : type === 'interval' ? '#89b4fa' : '#cba6f7'
                                }}
                            >
                                <span className="font-bold text-xl uppercase">{type}</span>
                                <span className="text-xs text-slate-400 mt-2 text-center px-2">
                                    {type === 'nominal' ? 'Labels / Names' : type === 'ordinal' ? 'Order Matters' : type === 'interval' ? 'No True Zero' : 'Absolute Zero'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Unified Chat Interface */}
                <div className="flex-[3] bg-[#252537] flex flex-col shadow-[-5px_0_15px_rgba(0,0,0,0.3)] z-50">
                    <UnifiedGenAIChat
                        moduleTitle="Data Sorter"
                        history={chatHistory}
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        variant="embedded"
                        className="h-full"
                    />
                </div>
            </div>

            <style>{`
                @keyframes flashGreen { 0% { background: rgba(166, 227, 161, 0.2); } 100% { background: transparent; } }
                .correct-flash { animation: flashGreen 0.5s; }
            `}</style>
        </div>
    );
};

export default DataSorterGame;
