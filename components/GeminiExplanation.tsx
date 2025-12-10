import React from 'react';

interface GeminiExplanationProps {
    explanation: string | null;
    isLoading: boolean;
}

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
    </div>
);

const GeminiExplanation: React.FC<GeminiExplanationProps> = ({ explanation, isLoading }) => {
    const isError = explanation?.includes('rate limit') || explanation?.includes('Failed to generate') || explanation?.includes('error occurred');

    return (
        <div className={`p-6 rounded-lg shadow-lg min-h-[120px] flex items-center border ${isError ? 'bg-amber-900/20 border-amber-500/50' : 'bg-slate-800 border-transparent'}`}>
            <div className="flex items-start space-x-4 w-full">
                <div className="text-3xl">
                    {isError ? '⚠️' : '💡'}
                </div>
                <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-2 ${isError ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {isError ? 'System Notice' : "Dr. Gem's Deets"}
                    </h3>
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : (
                        <p className="text-slate-300">{explanation}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeminiExplanation;