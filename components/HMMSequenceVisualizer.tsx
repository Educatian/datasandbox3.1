import React from 'react';
import { HMMSequenceItem } from '../types';

const stateToEmoji: Record<HMMSequenceItem['state'], string> = {
    Sunny: '☀️',
    Rainy: '🌧️',
};

const observationToEmoji: Record<HMMSequenceItem['observation'], string> = {
    Walk: '🚶',
    Read: '📖',
    Clean: '🧹',
};

const HMMSequenceVisualizer: React.FC<{ sequence: HMMSequenceItem[] }> = ({ sequence }) => {
    return (
        <div className="flex flex-wrap justify-center gap-2 p-4">
            {sequence.map((item, index) => (
                <div
                    key={index}
                    className="flex flex-col items-center bg-slate-900 rounded-lg p-3 w-16 h-24 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    aria-label={`Day ${index + 1}: State is ${item.state}, Observation is ${item.observation}`}
                >
                    <div className="text-3xl" title={`Hidden State: ${item.state}`}>{stateToEmoji[item.state]}</div>
                    <div className="text-3xl mt-2" title={`Observation: ${item.observation}`}>{observationToEmoji[item.observation]}</div>
                </div>
            ))}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
};

export default HMMSequenceVisualizer;
