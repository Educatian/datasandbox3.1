import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface CorrelationHeatmapProps {
    matrix: number[][];
    labels: string[];
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ matrix, labels }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || matrix.length === 0) return;

        const { width } = containerRef.current.getBoundingClientRect();
        const height = width; // Make it square
        const margin = { top: 50, right: 10, bottom: 10, left: 50 };
        const gridSize = Math.floor((width - margin.left - margin.right) / matrix.length);
        const actualWidth = gridSize * matrix.length + margin.left + margin.right;
        const actualHeight = gridSize * matrix.length + margin.top + margin.bottom;


        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('width', actualWidth).attr('height', actualHeight);

        const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        const colorScale = d3.scaleDiverging<string>()
            .domain([-1, 0, 1])
            .interpolator(d3.interpolatePiYG);

        const rows = g.selectAll('.row')
            .data(matrix)
            .enter().append('g')
            .attr('class', 'row')
            .attr('transform', (_, i) => `translate(0, ${i * gridSize})`);

        rows.selectAll('.cell')
            .data((d, i) => d.map((value, j) => ({ value, row: i, col: j })))
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', d => d.col * gridSize)
            .attr('width', gridSize)
            .attr('height', gridSize)
            .style('fill', d => colorScale(d.value))
            .style('stroke', 'rgb(30 41 59)')
            .style('stroke-width', '1px');
            
        // Add labels
        const labelPadding = 6;
        g.selectAll('.rowLabel')
            .data(labels)
            .enter().append('text')
            .text(d => d.toUpperCase())
            .attr('x', -labelPadding)
            .attr('y', (_, i) => i * gridSize + gridSize / 2)
            .style('text-anchor', 'end')
            .attr('alignment-baseline', 'middle')
            .style('fill', 'rgb(203 213 225)')
            .style('font-size', '10px');

        g.selectAll('.colLabel')
            .data(labels)
            .enter().append('text')
            .text(d => d.toUpperCase())
            .attr('transform', (_, i) => `translate(${i * gridSize + gridSize / 2}, ${-labelPadding}) rotate(-65)`)
            .style('text-anchor', 'start')
            .style('fill', 'rgb(203 213 225)')
            .style('font-size', '10px');

    }, [matrix, labels]);

    return (
        <div ref={containerRef} className="w-full">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default CorrelationHeatmap;