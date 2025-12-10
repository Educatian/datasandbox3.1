
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface SpringVisualizerProps {
    mass: number; // 0 to 100
    onMeasure: () => void;
}

const SpringVisualizer: React.FC<SpringVisualizerProps> = ({ mass, onMeasure }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Physics constants for simulation
    const NATURAL_LENGTH = 20; // Visual units
    const ELASTICITY = 0.6; // Stretch per unit mass

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 300;
        const height = 400;
        const svg = d3.select(svgRef.current);
        
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        // Background
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');

        // Ceiling
        svg.append('rect').attr('width', width).attr('height', 20).attr('fill', 'rgb(71 85 105)');
        svg.append('line').attr('x1', 0).attr('y1', 20).attr('x2', width).attr('y2', 20).attr('stroke', 'rgb(148 163 184)').attr('stroke-width', 2);

        // Calculate Spring Geometry
        const currentLength = NATURAL_LENGTH + (mass * ELASTICITY); // Visual length
        const startX = width / 2;
        const startY = 20;
        const endY = startY + currentLength * 3; // Scale up for visibility
        const coils = 12;
        const coilWidth = 40;

        // Generate Spring Path (Zigzag)
        let pathData = `M ${startX} ${startY}`;
        const segmentHeight = (endY - startY) / coils;
        
        for (let i = 1; i <= coils; i++) {
            const x = i % 2 === 0 ? startX + coilWidth / 2 : startX - coilWidth / 2;
            const y = startY + i * segmentHeight;
            pathData += ` L ${x} ${y}`;
        }
        // Final segment to center
        pathData += ` L ${startX} ${endY}`;

        // Draw Spring
        svg.append('path')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(203 213 225)')
            .attr('stroke-width', 3)
            .attr('stroke-linejoin', 'round');

        // Draw Mass
        const massSize = 30 + (mass / 100) * 30; // Mass grows slightly with weight
        svg.append('rect')
            .attr('x', startX - massSize / 2)
            .attr('y', endY)
            .attr('width', massSize)
            .attr('height', massSize)
            .attr('fill', 'rgb(250 204 21)') // Yellow
            .attr('stroke', 'rgb(234 88 12)')
            .attr('stroke-width', 2)
            .attr('rx', 4);

        // Mass Label
        svg.append('text')
            .attr('x', startX)
            .attr('y', endY + massSize / 2 + 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgb(124 45 18)')
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            .text(`${mass}g`);

        // Draw Ruler
        const rulerX = width - 60;
        svg.append('rect')
            .attr('x', rulerX)
            .attr('y', 20)
            .attr('width', 40)
            .attr('height', height - 40)
            .attr('fill', 'rgb(241 245 249)');

        // Ruler Ticks
        const scaleY = d3.scaleLinear().domain([0, 100]).range([20, height - 20]);
        
        for (let i = 0; i <= 100; i += 10) {
            const yPos = scaleY(i);
            svg.append('line')
                .attr('x1', rulerX)
                .attr('y1', yPos)
                .attr('x2', rulerX + (i % 50 === 0 ? 25 : 15))
                .attr('y2', yPos)
                .attr('stroke', 'black')
                .attr('stroke-width', 1);
            
            if (i % 20 === 0) {
                svg.append('text')
                    .attr('x', rulerX + 28)
                    .attr('y', yPos + 4)
                    .text(i)
                    .style('font-size', '10px')
                    .style('fill', 'black');
            }
        }

        // Measurement Line (Dashed)
        const measurementY = endY + massSize; // Measure from bottom of weight (arbitrary convention)
        
        // Map visual Y to "Data Y" (0-100 scale used in Regression plot)
        // We reverse engineer the visual calculation to match the ruler scale roughly
        // scaleY maps 0->20px (top) and 100->380px (bottom).
        
        svg.append('line')
            .attr('x1', startX)
            .attr('y1', endY)
            .attr('x2', rulerX)
            .attr('y2', endY)
            .attr('stroke', 'rgb(239 68 68)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

    }, [mass]);

    return (
        <div className="flex flex-col items-center space-y-4">
            <svg ref={svgRef} className="w-full h-full rounded-lg shadow-inner border border-slate-700"></svg>
            <button 
                onClick={onMeasure}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
                <span>📏 Measure & Record</span>
            </button>
        </div>
    );
};

export default SpringVisualizer;
