import React from 'react';
import { GazePoint } from '../types';
import MultimodalGazePlot from './MultimodalGazePlot';

interface MultimodalDisplayProps {
    gazeData: GazePoint[];
    currentTime: number;
}

const MultimodalDisplay: React.FC<MultimodalDisplayProps> = ({ gazeData, currentTime }) => {
    return (
        <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
            {/* Mock screen content */}
            <div className="absolute inset-0 p-8 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 bg-slate-700/50 rounded-lg flex items-center justify-center">
                    <p className="text-slate-500">Collaborative Task Area</p>
                </div>
                <div className="flex w-3/4 mt-4 space-x-4">
                    <div className="flex-1 h-24 bg-slate-700/50 rounded-lg"></div>
                    <div className="flex-1 h-24 bg-slate-700/50 rounded-lg"></div>
                </div>
            </div>

            {/* Gaze Plot Overlay */}
            <div className="absolute inset-0">
                <MultimodalGazePlot gazeData={gazeData} currentTime={currentTime} />
            </div>

             {/* Timestamp overlay */}
            <div className="absolute bottom-2 right-4 bg-black/50 text-white px-2 py-1 rounded font-mono text-sm">
                {currentTime.toFixed(2)}s
            </div>
        </div>
    );
};

export default MultimodalDisplay;
