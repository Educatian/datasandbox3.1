import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { RddPoint, RddResult, RegressionLine } from '../types';

interface RddPlotProps {
    data: RddPoint[];
    result: RddResult;
    cutoff: number;
    bandwidth: number;
}

const RddPlot: React.FC<RddPlotProps> = ({ data, result, cutoff, bandwidth }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        svg.attr('width', '100%')
           .attr('height', '100%')
           .attr('viewBox', `0 0 ${width} ${height}`)
           .attr('preserveAspectRatio', 'xMidYMid meet');

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        svg.selectAll('*').remove();
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');

        // Axes and Grid
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => '')).selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const chartArea = svg.append('g');

        // Clip path to keep elements inside the chart area
        svg.append('defs').append('clipPath')
            .attr('id', 'rdd-clip')
            .append('rect')
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('x', margin.left)
            .attr('y', margin.top);

        chartArea.attr('clip-path', 'url(#rdd-clip)');

        // Cutoff Line
        chartArea.append('line')
            .attr('x1', x(cutoff))
            .attr('y1', margin.top)
            .attr('x2', x(cutoff))
            .attr('y2', height - margin.bottom)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        // Points
        chartArea.append('g')
            .selectAll('circle')
            .data(data, (d: any) => d.id)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 3)
            .attr('fill', d => d.group === 'treatment' ? 'rgb(34 211 238)' : 'rgb(236 72 153)')
            .attr('opacity', d => Math.abs(d.x - cutoff) < bandwidth ? 0.9 : 0.2);

        // Regression Lines
        const renderLine = (line: RegressionLine, startX: number, endX: number, color: string) => {
            const x1 = startX, y1 = line.slope * x1 + line.intercept;
            const x2 = endX, y2 = line.slope * x2 + line.intercept;
            chartArea.append('line')
                .attr('x1', x(x1)).attr('y1', y(y1))
                .attr('x2', x(x2)).attr('y2', y(y2))
                .attr('stroke', color)
                .attr('stroke-width', 2.5);
        };
        
        renderLine(result.controlLine, Math.max(0, cutoff - bandwidth), cutoff, 'rgb(236 72 153)');
        renderLine(result.treatmentLine, cutoff, Math.min(100, cutoff + bandwidth), 'rgb(34 211 238)');

    }, [data, result, cutoff, bandwidth]);

    return <svg ref={svgRef}></svg>;
};

export default RddPlot;
