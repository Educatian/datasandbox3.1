import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { FeatureContribution } from '../types';

interface ContributionBarsProps {
    title: string;
    contributions: FeatureContribution[];
    color: string;
}

const ContributionBars: React.FC<ContributionBarsProps> = ({ title, contributions, color }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || contributions.length === 0) {
            if (svgRef.current) d3.select(svgRef.current).selectAll('*').remove();
            return;
        }

        const data = contributions.map(c => ({...c, value: Math.abs(c.value)}));
        const { height } = containerRef.current.getBoundingClientRect();
        const width = 200;
        const margin = { top: 0, right: 30, bottom: 0, left: 120 };
        const chartHeight = Math.max(150, data.length * 30); // Dynamic height
        
        const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${chartHeight}`);
        svg.selectAll('*').remove();
        
        const y = d3.scaleBand()
            .domain(data.map(d => d.feature))
            .range([margin.top, chartHeight - margin.bottom])
            .padding(0.2);

        const xMax = d3.max(data, d => d.value) || 10;
        const x = d3.scaleLinear()
            .domain([0, xMax])
            .range([0, width - margin.left - margin.right]);

        const g = svg.append('g').attr('transform', `translate(${margin.left}, 0)`);

        g.selectAll('rect')
            .data(data)
            .join('rect')
            .attr('y', d => y(d.feature)!)
            .attr('height', y.bandwidth())
            .attr('fill', color)
            .transition().duration(500)
            .attr('width', d => x(d.value));

        // Labels
        g.selectAll('text.value')
            .data(data)
            .join('text')
            .attr('class', 'value')
            .attr('x', d => x(d.value) + 4)
            .attr('y', d => y(d.feature)! + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('fill', 'white')
            .style('font-size', '10px')
            .text(d => d.value.toFixed(1));

        // Y-axis
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y).tickSize(0))
            .call(s => s.select('.domain').remove())
            .selectAll('text')
            .style('fill', 'rgb(203 213 225)')
            .style('font-size', '11px');

    }, [contributions, color]);

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-md font-semibold text-slate-300 mb-2">{title}</h4>
            {contributions.length === 0 ? (
                 <p className="text-slate-500 text-sm h-[150px] flex items-center">No factors in this category.</p>
            ) : (
                <div ref={containerRef} className="w-full">
                    <svg ref={svgRef}></svg>
                </div>
            )}
        </div>
    );
};

export default ContributionBars;