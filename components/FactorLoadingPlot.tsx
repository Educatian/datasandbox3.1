import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { FactorLoading } from '../types';

interface FactorLoadingPlotProps {
    loadings: FactorLoading[];
    explainedVariance: number[];
    factors: ['factor1' | 'factor2' | 'factor3', 'factor1' | 'factor2' | 'factor3'];
}

const FactorLoadingPlot: React.FC<FactorLoadingPlotProps> = ({ loadings, explainedVariance, factors }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 40, right: 40, bottom: 40, left: 40 };

        svg.attr('width', '100%')
           .attr('height', '100%')
           .attr('viewBox', `0 0 ${width} ${height}`)
           .attr('preserveAspectRatio', 'xMidYMid meet');

        svg.selectAll('*').remove();

        const x = d3.scaleLinear().domain([-1, 1]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([-1, 1]).range([height - margin.bottom, margin.top]);

        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');

        // Zero axes
        svg.append('line').attr('x1', margin.left).attr('y1', y(0)).attr('x2', width - margin.right).attr('y2', y(0)).attr('stroke', 'rgb(100 116 139)').attr('stroke-dasharray', '2,2');
        svg.append('line').attr('x1', x(0)).attr('y1', margin.top).attr('x2', x(0)).attr('y2', height - margin.bottom).attr('stroke', 'rgb(100 116 139)').attr('stroke-dasharray', '2,2');

        // Main axes
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5)).attr('color', 'rgb(100 116 139)');

        // Axis labels
        const factorXIndex = parseInt(factors[0].replace('factor', '')) - 1;
        const factorYIndex = parseInt(factors[1].replace('factor', '')) - 1;
        svg.append('text').attr('text-anchor', 'middle').attr('x', width / 2).attr('y', height - 5)
            .text(`Factor ${factorXIndex + 1} (${(explainedVariance[factorXIndex] * 100).toFixed(1)}%)`).style('fill', 'white');
        svg.append('text').attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').attr('y', 15).attr('x', -height / 2)
            .text(`Factor ${factorYIndex + 1} (${(explainedVariance[factorYIndex] * 100).toFixed(1)}%)`).style('fill', 'white');

        const points = svg.append('g').selectAll('g')
            .data(loadings).join('g');

        points.append('circle')
            .attr('cx', d => x(d[factors[0]] as number))
            .attr('cy', d => y(d[factors[1]] as number))
            .attr('r', 5)
            .attr('fill', 'rgb(34 211 238)');
            
        points.append('text')
            .attr('x', d => x(d[factors[0]] as number) + 8)
            .attr('y', d => y(d[factors[1]] as number) + 4)
            .text(d => (d.item as string).toUpperCase())
            .style('fill', 'rgb(203 213 225)')
            .style('font-size', '10px');

    }, [loadings, explainedVariance, factors]);

    return <svg ref={svgRef}></svg>;
};

export default FactorLoadingPlot;