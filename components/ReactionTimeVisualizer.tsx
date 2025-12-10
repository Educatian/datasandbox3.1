
import React, { useState } from 'react';

interface ReactionTimeVisualizerProps {
    distractionLevel: number; // 0-100
    onTest: () => void;
}

const ReactionTimeVisualizer: React.FC<ReactionTimeVisualizerProps> = ({ distractionLevel, onTest }) => {
    const [isStimulusActive, setIsStimulusActive] = useState(false);
    
    const handleSimulate = () => {
        setIsStimulusActive(true);
        setTimeout(() => {
            setIsStimulusActive(false);
            onTest();
        }, 400 + Math.random() * 200); // Simulate processing time
    };

    // Calculate number of distractions to show based on level
    const numDistractions = Math.floor(distractionLevel / 8);
    const icons = ['📱', '🔔', '💬', '📧', '🎵', '🎮', '📺', '⌚', '📢', '🔥'];

    return (
        <div className="flex flex-col items-center space-y-6 w-full h-full justify-center bg-slate-900 rounded-lg p-4 border border-slate-700 relative overflow-hidden min-h-[300px]">
            
            {/* Floating Distractions */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: numDistractions }).map((_, i) => (
                    <div 
                        key={i}
                        className="absolute text-2xl animate-bounce"
                        style={{
                            left: `${Math.random() * 80 + 10}%`,
                            top: `${Math.random() * 80 + 10}%`,
                            animationDuration: `${1 + Math.random() * 2}s`,
                            opacity: 0.6
                        }}
                    >
                        {icons[i % icons.length]}
                    </div>
                ))}
            </div>

            {/* Subject Head */}
            <div className="relative z-10 flex flex-col items-center">
                <div className={`text-8xl transition-transform duration-200 ${isStimulusActive ? 'scale-110' : 'scale-100'}`}>
                    {isStimulusActive ? '🤯' : '😐'}
                </div>
                <div className="mt-4 text-slate-400 font-mono text-sm">Subject #042</div>
            </div>

            {/* Cognition Bar */}
            <div className="w-full max-w-xs space-y-1 z-10">
                <div className="flex justify-between text-xs text-slate-400">
                    <span>Cognitive Load</span>
                    <span>{distractionLevel}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-600">
                    <div 
                        className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-300"
                        style={{ width: `${distractionLevel}%` }}
                    ></div>
                </div>
            </div>

            {/* Action Button */}
            <button 
                onClick={handleSimulate}
                disabled={isStimulusActive}
                className="z-10 w-full max-w-xs bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-lg flex items-center justify-center space-x-2"
            >
                <span>{isStimulusActive ? 'Processing...' : '⚡ Measure Reaction'}</span>
            </button>
        </div>
    );
};

export default ReactionTimeVisualizer;
