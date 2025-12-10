import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface MasteryBarChartProps {
    mastery: number;
}

const MasteryBarChart: React.FC<MasteryBarChartProps> = ({ mastery }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 500;
    const height = 80;
    const margin = { top: 10, right: 20, bottom: 10, left: 20 };

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Background bar
        g.append('rect')
            .attr('width', chartWidth)
            .attr('height', chartHeight)
            .attr('fill', 'rgb(51 65 85)')
            .attr('rx', 8);

        // Mastery bar
        const bar = g.selectAll('.mastery-bar')
            .data([mastery])
            .join('rect')
            .attr('class', 'mastery-bar')
            .attr('height', chartHeight)
            .attr('fill', 'rgb(225 29 72)') // Rose-600
            .attr('rx', 8);
            
        bar.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .attr('width', d => d * chartWidth);
        
        // Text label
        const label = g.selectAll('.mastery-label')
            .data([mastery])
            .join('text')
            .attr('class', 'mastery-label')
            .attr('y', chartHeight / 2)
            .attr('dy', '0.35em')
            .attr('fill', 'white')
            .style('font-size', '16px')
            .style('font-weight', 'bold');
            
        label.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .attr('x', d => Math.max(15, d * chartWidth - 10)) // Position inside or at start
            .attr('text-anchor', d => d > 0.15 ? 'end' : 'start')
            .tween('text', function(d) {
                // FIX: Cast `this` to SVGTextElement to safely access `textContent` for the interpolation.
                const element = this as SVGTextElement;
                const i = d3.interpolate(parseFloat(element.textContent?.replace('%', '') || '0') / 100, d);
                return (t) => {
                    d3.select(element).text(`${(i(t) * 100).toFixed(1)}%`);
                };
            });

    }, [mastery]);

    return <svg ref={svgRef}></svg>;
};

export default MasteryBarChart;