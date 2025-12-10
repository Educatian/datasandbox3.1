
import React, { useState, useEffect, useRef } from 'react';
import AITutor, { ChatMessage } from './AITutor';
import { getChatResponse } from '../services/geminiService';

interface GaltonBoardProps {
    onBack: () => void;
}

interface Ball {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    settled: boolean;
    bin: number | null;
}

const GaltonBoard: React.FC<GaltonBoardProps> = ({ onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [balls, setBalls] = useState<Ball[]>([]);
    const [bins, setBins] = useState<number[]>(Array(11).fill(0));
    const [isRunning, setIsRunning] = useState(false);
    
    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { text: "Welcome to the Galton Board! 🟢", sender: 'bot' },
        { text: "Watch how randomness creates order. Balls fall left or right by chance, but together they form a Normal Distribution (Bell Curve).", sender: 'bot' }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Physics Loop
    useEffect(() => {
        if (!isRunning && balls.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const pegRadius = 3;
        const ballRadius = 4;
        const rows = 10;
        const startY = 50;
        const gapY = 30;
        
        let animationFrameId: number;

        const update = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Pegs
            ctx.fillStyle = '#64748b';
            for (let row = 0; row < rows; row++) {
                const cols = row + 1;
                const rowWidth = (cols - 1) * 30;
                const startX = width / 2 - rowWidth / 2;
                for (let col = 0; col < cols; col++) {
                    ctx.beginPath();
                    ctx.arc(startX + col * 30, startY + row * gapY, pegRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw Bins
            const binWidth = 30;
            const binY = startY + rows * gapY + 20;
            ctx.fillStyle = '#334155';
            for (let i = 0; i <= rows; i++) {
                const x = width / 2 - (rows * 30) / 2 + i * 30 - 15; // Shift to align between pegs
                ctx.fillRect(x, binY, 2, height - binY);
                
                // Draw stack count
                const count = bins[i] || 0;
                if (count > 0) {
                    ctx.fillStyle = '#4ade80';
                    const stackHeight = Math.min(count * (ballRadius * 2 + 1), height - binY);
                    ctx.fillRect(x + 2, height - stackHeight, binWidth - 4, stackHeight);
                    ctx.fillStyle = '#334155';
                }
            }

            // Update Balls
            setBalls(prevBalls => {
                const activeBalls = [];
                let binsChanged = false;
                const newBins = [...bins];

                for (const ball of prevBalls) {
                    if (ball.settled) continue;

                    ball.x += ball.vx;
                    ball.y += ball.vy;
                    ball.vy += 0.2; // Gravity

                    // Peg Collision (Simple logic: if close to a peg row Y, decide L/R)
                    // We calculate purely based on discrete steps for simulation stability or simple distance check
                    // Let's use simple logic: if y matches a peg row, random perturb vx
                    
                    const row = Math.round((ball.y - startY) / gapY);
                    if (row >= 0 && row < rows && Math.abs(ball.y - (startY + row * gapY)) < 5) {
                        // Check if close to an actual peg X
                        const cols = row + 1;
                        const rowWidth = (cols - 1) * 30;
                        const startX = width / 2 - rowWidth / 2;
                        
                        // Find nearest peg X
                        const col = Math.round((ball.x - startX) / 30);
                        const pegX = startX + col * 30;
                        
                        if (Math.abs(ball.x - pegX) < 10) {
                            // Hit!
                            ball.vy *= 0.6; // Lose energy
                            ball.y = startY + row * gapY + 6; // Push out
                            // Random bounce
                            if (Math.random() > 0.5) ball.vx = 1.5; 
                            else ball.vx = -1.5;
                        }
                    }

                    // Floor Collision (Bins)
                    if (ball.y > height - 10) {
                        ball.settled = true;
                        // Calculate bin
                        const binStart = width / 2 - (rows * 30) / 2 - 15;
                        const binIdx = Math.floor((ball.x - binStart) / 30);
                        if (binIdx >= 0 && binIdx <= rows) {
                            newBins[binIdx] = (newBins[binIdx] || 0) + 1;
                            binsChanged = true;
                        }
                    } else {
                        activeBalls.push(ball);
                    }
                }
                
                if (binsChanged) setBins(newBins);
                return activeBalls;
            });

            // Draw Balls
            ctx.fillStyle = '#facc15';
            balls.forEach(ball => {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
                ctx.fill();
            });

            if (isRunning || balls.length > 0) {
                animationFrameId = requestAnimationFrame(update);
            }
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isRunning, balls, bins]);

    const dropBall = () => {
        setBalls(prev => [...prev, {
            id: Date.now(),
            x: 250 + (Math.random() - 0.5) * 5,
            y: 10,
            vx: 0,
            vy: 2,
            settled: false,
            bin: null
        }]);
    };

    const toggleRun = () => {
        if (!isRunning) {
            setIsRunning(true);
            const interval = setInterval(() => {
                dropBall();
            }, 200); // 5 balls per second
            // Stop after 100 balls or user click
            setTimeout(() => {
                clearInterval(interval);
                setIsRunning(false);
            }, 10000);
        } else {
            setIsRunning(false);
        }
    };

    // Chat Logic
    const handleSendMessage = async (msg: string) => {
        setChatHistory(prev => [...prev, { text: msg, sender: 'user' }]);
        setIsChatLoading(true);
        const context = `Dr. Gem describing Galton Board. 
        Balls fall, hit pegs, go left/right 50/50. 
        Result is Binomial Distribution -> Normal Distribution. 
        Central Limit Theorem in action.`;
        
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
                <button onClick={onBack} className="text-green-400 hover:text-green-300 mb-4 inline-block">&larr; Back to Portal</button>
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-green-400">The Galton Board</h1>
                    <p className="text-slate-400 mt-2">The Central Limit Theorem in motion.</p>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 rounded-xl border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center">
                    <canvas ref={canvasRef} width={500} height={500} className="w-full h-full max-w-[500px]" />
                    <div className="flex gap-4 mt-4">
                        <button onClick={dropBall} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white font-bold">Drop 1</button>
                        <button onClick={toggleRun} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-bold">
                            {isRunning ? "Stop Stream" : "Stream Balls"}
                        </button>
                        <button onClick={() => setBins(Array(11).fill(0))} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white">Reset</button>
                    </div>
                </div>

                <div className="lg:col-span-1 h-[600px]">
                    <AITutor 
                        history={chatHistory}
                        onSendMessage={handleSendMessage}
                        isLoading={isChatLoading}
                        className="h-full"
                        suggestedActions={[
                            { label: "Why bell curve?", action: () => handleSendMessage("Why do they form a bell shape?") },
                            { label: "What is CLT?", action: () => handleSendMessage("What is the Central Limit Theorem?") },
                        ]}
                    />
                </div>
            </main>
        </div>
    );
};

export default GaltonBoard;
