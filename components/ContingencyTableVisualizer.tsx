import React from 'react';
import * as d3 from 'd3';
import { ContingencyTableData } from '../types';

interface ContingencyTableVisualizerProps {
    observed: ContingencyTableData;
    expected: ContingencyTableData;
}

const ContingencyTableVisualizer: React.FC<ContingencyTableVisualizerProps> = ({ observed, expected }) => {
    if (observed.length === 0 || expected.length === 0) return null;
    
    const residuals = observed.map((row, i) =>
        row.map((obs, j) => {
            const exp = expected[i][j];
            return exp > 0 ? (obs - exp) / Math.sqrt(exp) : 0; // Pearson residual
        })
    );

    const maxAbsResidual = d3.max(residuals.flat(), d => Math.abs(d)) || 1;

    const colorScale = d3.scaleDiverging<string>()
        .domain([-maxAbsResidual, 0, maxAbsResidual])
        .interpolator(d3.interpolateRdBu);


    return (
        <div className="grid grid-cols-2 gap-4 h-full">
            {observed.map((row, i) => 
                row.map((_cell, j) => {
                    const obs = observed[i][j];
                    const exp = expected[i][j];
                    const residual = residuals[i][j];
                    const bgColor = colorScale(residual);

                    return (
                        <div key={`${i}-${j}`}
                             className="rounded-lg p-4 flex flex-col justify-center items-center transition-colors duration-300"
                             style={{ backgroundColor: bgColor }}
                        >
                            <div className="text-sm font-semibold text-white/70">Observed</div>
                            <div className="text-4xl font-bold text-white mb-2">{obs}</div>
                             <div className="text-xs text-white/70">Expected: {exp.toFixed(1)}</div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ContingencyTableVisualizer;
