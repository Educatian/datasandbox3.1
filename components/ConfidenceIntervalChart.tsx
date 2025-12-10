import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ConfidenceInterval } from '../types';

interface ConfidenceIntervalChartProps {
    intervals: ConfidenceInterval[];
    populationMean: number;
}

const MAX_INTERVALS_DISPLAYED = 100;

const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({ intervals, populationMean }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 500;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear()
            .domain([populationMean - 40, populationMean + 40])
            .range([margin.left, width - margin.right]);

        // Display up to MAX_INTERVALS_DISPLAYED, starting from the most recent
        const displayedIntervals = intervals.slice(-MAX_INTERVALS_DISPLAYED);
        const yDomainMax = Math.max(MAX_INTERVALS_DISPLAYED, displayedIntervals.length);

        const y = d3.scaleLinear()
            .domain([0, yDomainMax])
            .range([height - margin.bottom, margin.top]);

        // Background
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgb(30 41 59)');

        // Axes and Grid
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => '')).selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const chartArea = svg.append('g')
            .attr('clip-path', 'url(#ci-clip)');
        
        svg.append('defs').append('clipPath')
            .attr('id', 'ci-clip')
            .append('rect')
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('x', margin.left)
            .attr('y', margin.top);

        // Population Mean Line
        chartArea.append('line')
            .attr('x1', x(populationMean))
            .attr('y1', margin.top)
            .attr('x2', x(populationMean))
            .attr('y2', height - margin.bottom)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');

        // Confidence Intervals
        const intervalGroup = chartArea.append('g');

        intervalGroup.selectAll('line.interval-line')
            .data(displayedIntervals, (d: any) => d.id)
            .join('line')
            .attr('class', 'interval-line')
            .attr('x1', d => x(d.lowerBound))
            .attr('y1', (_, i) => y(i + 0.5))
            .attr('x2', d => x(d.upperBound))
            .attr('y2', (_, i) => y(i + 0.5))
            .attr('stroke', d => d.captured ? 'rgb(74 222 128)' : 'rgb(248 113 113)') // Green / Red
            .attr('stroke-width', 2);
            
        // Sample Means
        intervalGroup.selectAll('circle.sample-mean')
            .data(displayedIntervals, (d: any) => d.id)
            .join('circle')
            .attr('class', 'sample-mean')
            .attr('cx', d => x(d.sampleMean))
            .attr('cy', (_, i) => y(i + 0.5))
            .attr('r', 2.5)
            .attr('fill', 'white');
            
    }, [intervals, populationMean]);

    return <svg ref={svgRef}></svg>;
};

export default ConfidenceIntervalChart;