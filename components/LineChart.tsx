

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ValueTimePoint } from '../types';

interface LineChartProps {
    data: ValueTimePoint[];
    movingAverageData: ValueTimePoint[];
    onPointUpdate: (id: number, newValue: number) => void;
}

const LineChart: React.FC<LineChartProps> = ({ data, movingAverageData, onPointUpdate }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        svg.attr('width', width).attr('height', height);

        // Initialize layers
        if (svg.select('.bg-layer').empty()) {
            svg.append('rect').attr('class', 'bg-layer')
                .attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');
            svg.append('g').attr('class', 'grid-x');
            svg.append('g').attr('class', 'grid-y');
            svg.append('g').attr('class', 'x-axis');
            svg.append('g').attr('class', 'y-axis');
            svg.append('path').attr('class', 'ma-line');
            svg.append('path').attr('class', 'data-line');
            svg.append('g').attr('class', 'points-layer');
        }

        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.time) as [number, number])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([height - margin.bottom, margin.top]);

        // Update Axes and Grid
        svg.select<SVGGElement>('.x-axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.select<SVGGElement>('.y-axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        
        svg.select<SVGGElement>('.grid-x').attr('transform', `translate(0,${height - margin.bottom})`)
           .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
           .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        svg.select<SVGGElement>('.grid-y').attr('transform', `translate(${margin.left},0)`)
           .call(d3.axisLeft(y).ticks(10).tickSize(-width + margin.left + margin.right).tickFormat(() => ''))
           .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const lineGenerator = d3.line<ValueTimePoint>()
            .x(d => x(d.time))
            .y(d => y(d.value));

        // Update Lines
        svg.select('.ma-line')
            .datum(movingAverageData)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(236 72 153)')
            .attr('stroke-width', 2.5)
            .attr('d', lineGenerator);
            
        svg.select('.data-line')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(34 211 238)')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.8)
            .attr('d', lineGenerator);

        // Drag behavior
        const drag = d3.drag<SVGCircleElement, ValueTimePoint>()
            .subject(function(event, d) {
                // Fix for jumping issue
                return { x: x(d.time), y: y(d.value) };
            })
            .on('start', function() { d3.select(this).attr('r', 8).attr('stroke', 'white'); })
            .on('drag', function (event, d) {
                // Constrain drag to vertical movement only
                const newY = Math.max(0, Math.min(100, y.invert(event.y)));
                d3.select(this).attr('cy', y(newY));
                onPointUpdate(d.id, newY);
            })
            .on('end', function() { d3.select(this).attr('r', 6).attr('stroke', 'rgb(15 23 42)'); });

        // Update Points
        svg.select('.points-layer')
            .selectAll('circle')
            .data(data, (d: any) => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 6)
                    .attr('fill', 'rgb(34 211 238)')
                    .attr('stroke', 'rgb(15 23 42)')
                    .attr('stroke-width', 2)
                    .style('cursor', 'ns-resize')
                    .call(drag), // Attach drag only on enter
                update => update
                    .attr('cx', d => x(d.time))
                    .attr('cy', d => y(d.value)),
                    // No drag re-attachment here
                exit => exit.remove()
            );

    }, [data, movingAverageData, onPointUpdate]);

    return <svg ref={svgRef}></svg>;
};

export default LineChart;
