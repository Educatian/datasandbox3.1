import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Participant } from '../types';

interface QuantitativeBarChartProps {
    allData: Participant[];
    subgroupData: Participant[] | null;
}

const QuantitativeBarChart: React.FC<QuantitativeBarChartProps> = ({ allData, subgroupData }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 600;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([margin.left, width - margin.right]);

        const histogram = d3.bin<Participant, number>()
            .value(d => d.score)
            .domain(x.domain() as [number, number])
            .thresholds(x.ticks(20));

        const allBins = histogram(allData);
        
        const yMax = d3.max(allBins, d => d.length) || 10;
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([height - margin.bottom, margin.top]);
            
        // Axes
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');
        
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(d3.axisLeft(y).ticks(5))
            .attr('color', 'rgb(100 116 139)');

        // Axis labels
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height - 5)
            .style('fill', 'rgb(156 163 175)')
            .text('Survey Score');
            
        // All data bars (background)
        svg.append('g')
            .selectAll('rect')
            .data(allBins)
            .join('rect')
            .attr('x', d => x(d.x0!) + 1)
            .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
            .attr('y', d => y(d.length))
            .attr('height', d => y(0) - y(d.length))
            .attr('fill', 'rgb(71 85 105)'); // slate-500

        // Subgroup data bars (foreground)
        if (subgroupData) {
            const subgroupBins = histogram(subgroupData);
            svg.append('g')
                .selectAll('rect')
                .data(subgroupBins)
                .join(
                    enter => enter.append('rect')
                        .attr('fill', 'rgb(225 29 72)') // rose-600
                        .attr('x', d => x(d.x0!) + 1)
                        .attr('width', d => Math.max(0, x(d.x1!) - x(d.x0!) - 1))
                        .attr('y', y(0))
                        .attr('height', 0)
                      .transition().duration(500)
                        .attr('y', d => y(d.length))
                        .attr('height', d => y(0) - y(d.length)),
                    update => update
                      .transition().duration(500)
                        .attr('y', d => y(d.length))
                        .attr('height', d => y(0) - y(d.length)),
                    exit => exit
                      .transition().duration(500)
                        .attr('y', y(0))
                        .attr('height', 0)
                        .remove()
                );
        }

    }, [allData, subgroupData]);

    return (
        <div className="w-full h-full">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default QuantitativeBarChart;
