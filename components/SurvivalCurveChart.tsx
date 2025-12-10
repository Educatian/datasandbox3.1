import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { SurvivalCurvePoint } from '../types';

interface SurvivalCurveChartProps {
    curves: {
        name: string;
        data: SurvivalCurvePoint[];
        color: string;
    }[];
}

const SurvivalCurveChart: React.FC<SurvivalCurveChartProps> = ({ curves }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 50, left: 50 };

        svg.selectAll('*').remove();
        svg.attr('width', width).attr('height', height);

        const xMax = d3.max(curves.flatMap(c => c.data), d => d.time) || 20;
        
        const x = d3.scaleLinear()
            .domain([0, xMax])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([height - margin.bottom, margin.top]);

        // Background and Grid
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgb(30 41 59)');

        svg.append('g').attr('class', 'grid')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
            .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');
            
        svg.append('g').attr('class', 'grid')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(10).tickSize(-width + margin.left + margin.right).tickFormat(() => ''))
            .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        // Axes
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).tickFormat(d3.format('.0%')))
            .attr('color', 'rgb(100 116 139)');
            
        // Axis Labels
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height - 10)
            .style('fill', 'rgb(156 163 175)')
            .text('Time (e.g., Weeks in Course)');
            
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .style('fill', 'rgb(156 163 175)')
            .text('Survival Probability');

        // Step line generator
        const lineGenerator = d3.line<SurvivalCurvePoint>()
            .x(d => x(d.time))
            .y(d => y(d.survivalProbability))
            .curve(d3.curveStepAfter);

        // Draw curves
        curves.forEach(curve => {
            svg.append('path')
                .datum(curve.data)
                .attr('fill', 'none')
                .attr('stroke', curve.color)
                .attr('stroke-width', 2.5)
                .attr('d', lineGenerator);
        });
        
        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left + 10}, ${margin.top + 10})`);

        curves.forEach((curve, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
            
            legendItem.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', curve.color);
            
            legendItem.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .text(curve.name)
                .style('fill', 'white')
                .style('font-size', '12px');
        });

    }, [curves]);

    return <svg ref={svgRef}></svg>;
};

export default SurvivalCurveChart;