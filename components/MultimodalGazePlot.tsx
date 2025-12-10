import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { GazePoint } from '../types';

interface MultimodalGazePlotProps {
    gazeData: GazePoint[];
    currentTime: number;
}

const COLORS = ['rgb(34 211 238)', 'rgb(236 72 153)']; // Cyan, Pink

const MultimodalGazePlot: React.FC<MultimodalGazePlotProps> = ({ gazeData, currentTime }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const currentGazePoints = useMemo(() => {
        const p0Points = gazeData.filter(d => d.participantId === 0 && d.time <= currentTime);
        const p1Points = gazeData.filter(d => d.participantId === 1 && d.time <= currentTime);
        return [
            p0Points.length > 0 ? p0Points[p0Points.length - 1] : null,
            p1Points.length > 0 ? p1Points[p1Points.length - 1] : null,
        ].filter((p): p is GazePoint => p !== null);
    }, [gazeData, currentTime]);
    
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const { width, height } = svg.node()!.getBoundingClientRect();
        
        const xScale = d3.scaleLinear().domain([0, 1000]).range([0, width]);
        const yScale = d3.scaleLinear().domain([0, 600]).range([0, height]);

        // FIX: Specify the datum type for the selection to ensure correct type inference in the .data() key function.
        const circles = svg.selectAll<SVGCircleElement, GazePoint>('circle')
            .data(currentGazePoints, d => d.participantId)
            .join(
                enter => enter.append('circle')
                    .attr('r', 15)
                    .attr('fill', d => COLORS[d.participantId])
                    .attr('fill-opacity', 0.5)
                    .attr('stroke', d => COLORS[d.participantId])
                    .attr('stroke-width', 2)
                    .attr('cx', d => xScale(d.x))
                    .attr('cy', d => yScale(d.y)),
                update => update.transition().duration(50).ease(d3.easeLinear)
                    .attr('cx', d => xScale(d.x))
                    .attr('cy', d => yScale(d.y))
            );

    }, [currentGazePoints]);

    return <svg ref={svgRef} className="w-full h-full"></svg>;
};

export default MultimodalGazePlot;
