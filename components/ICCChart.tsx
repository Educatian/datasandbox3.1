import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { IRTParams } from '../types';
import { calculateIrtProbability } from '../services/statisticsService';

interface ICCChartProps {
    params: IRTParams;
}

const ICCChart: React.FC<ICCChartProps> = ({ params }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 50, left: 50 };

        svg.selectAll('*').remove();
        svg.attr('width', width).attr('height', height);

        const x = d3.scaleLinear()
            .domain([-3, 3])
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
            .text('Student Ability (θ)');
            
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .style('fill', 'rgb(156 163 175)')
            .text('Probability of Correct Answer');

        // Difficulty line
        svg.append('line')
            .attr('x1', x(params.difficulty))
            .attr('x2', x(params.difficulty))
            .attr('y1', y(0))
            .attr('y2', y(0.5))
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,4');
        
        svg.append('line')
            .attr('x1', x(-3))
            .attr('x2', x(params.difficulty))
            .attr('y1', y(0.5))
            .attr('y2', y(0.5))
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4,4');

        // ICC Curve
        const curveData = d3.range(-3, 3, 0.05).map(ability => ({
            ability,
            prob: calculateIrtProbability(ability, params)
        }));

        const lineGenerator = d3.line<{ ability: number, prob: number }>()
            .x(d => x(d.ability))
            .y(d => y(d.prob));

        svg.append('path')
            .datum(curveData)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(163 230 53)')
            .attr('stroke-width', 3)
            .attr('d', lineGenerator);

    }, [params]);

    return <svg ref={svgRef}></svg>;
};

export default ICCChart;