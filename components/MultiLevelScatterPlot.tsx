import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GroupPoint, RegressionLine } from '../types';

interface MultiLevelScatterPlotProps {
    data: GroupPoint[];
    overallLine: RegressionLine;
    groupLines: (RegressionLine & { groupId: number })[];
    groupColors: string[];
}

const MultiLevelScatterPlot: React.FC<MultiLevelScatterPlotProps> = ({ data, overallLine, groupLines, groupColors }) => {
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

        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        
        svg.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('x', margin.left)
            .attr('y', margin.top);

        const renderLine = (line: RegressionLine, color: string, strokeWidth: number, strokeDasharray?: string) => {
            const x1 = 0, y1 = line.slope * x1 + line.intercept;
            const x2 = 100, y2 = line.slope * x2 + line.intercept;
            svg.append('line')
                .attr('x1', x(x1)).attr('y1', y(y1))
                .attr('x2', x(x2)).attr('y2', y(y2))
                .attr('stroke', color)
                .attr('stroke-width', strokeWidth)
                .attr('stroke-dasharray', strokeDasharray)
                .attr('clip-path', 'url(#clip)');
        };
        
        // Render group lines first
        groupLines.forEach(line => {
            renderLine(line, groupColors[line.groupId], 1.5);
        });

        // Render overall line on top
        renderLine(overallLine, 'white', 3, '5,5');

        // Render points
        svg.append('g')
            .attr('clip-path', 'url(#clip)')
            .selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4)
            .attr('fill', d => groupColors[d.groupId])
            .attr('opacity', 0.8);

    }, [data, overallLine, groupLines, groupColors]);

    return <svg ref={svgRef}></svg>;
};

export default MultiLevelScatterPlot;