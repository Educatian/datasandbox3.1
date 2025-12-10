

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { LogisticPoint, LogisticCurveParams } from '../types';
import { predictLogisticProbability } from '../services/statisticsService';

interface LogisticRegressionPlotProps {
    data: LogisticPoint[];
    curveParams: LogisticCurveParams;
    onUpdatePoint: (id: number, newX: number, newOutcome: 0 | 1) => void;
    onAddPoint: (x: number, outcome: 0 | 1) => void;
    onSelectPoint: (point: LogisticPoint | null) => void;
    selectedPointId?: number | null;
}

const LogisticRegressionPlot: React.FC<LogisticRegressionPlotProps> = ({ data, curveParams, onUpdatePoint, onAddPoint, onSelectPoint, selectedPointId }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 500, height = 500;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.attr('width', width).attr('height', height);

        // Initialize layers
        if (svg.select('.bg-layer').empty()) {
             const background = svg.append('rect')
                .attr('class', 'bg-layer')
                .attr('width', width).attr('height', height)
                .attr('fill', 'rgb(30 41 59)').style('cursor', 'crosshair');

            svg.append('g').attr('class', 'grid-x');
            svg.append('g').attr('class', 'grid-y');
            svg.append('g').attr('class', 'x-axis');
            svg.append('g').attr('class', 'y-axis');
            
            const chartArea = svg.append('g').attr('class', 'chart-area');
            svg.append('defs').append('clipPath').attr('id', 'lr-clip')
                .append('rect').attr('width', width - margin.left - margin.right).attr('height', height - margin.top - margin.bottom)
                .attr('x', margin.left).attr('y', margin.top);
            
            chartArea.attr('clip-path', 'url(#lr-clip)');
            chartArea.append('line').attr('class', 'boundary-line');
            chartArea.append('path').attr('class', 'logistic-curve');
            chartArea.append('g').attr('class', 'points-layer');
        }

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([-0.1, 1.1]).range([height - margin.bottom, margin.top]);

        // Update Background Click
        svg.select('.bg-layer').on('click', (event) => {
            const [px, py] = d3.pointer(event);
            const newX = x.invert(px);
            const newY = y.invert(py);
            if (newX >= 0 && newX <= 100) {
                const newOutcome = newY > 0.5 ? 1 : 0;
                onAddPoint(newX, newOutcome);
            }
        });

        // Update Axes & Grid
        svg.select<SVGGElement>('.x-axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.select<SVGGElement>('.y-axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%'))).attr('color', 'rgb(100 116 139)');
        svg.select<SVGGElement>('.grid-y').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(10).tickSize(-width + margin.left + margin.right).tickFormat(() => '')).selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const chartArea = svg.select('.chart-area');

        // Decision boundary (p=0.5)
        const boundaryX = curveParams.beta1 !== 0 ? -curveParams.beta0 / curveParams.beta1 : null;
        if (boundaryX && boundaryX > 0 && boundaryX < 100) {
            chartArea.select('.boundary-line')
                .attr('x1', x(boundaryX)).attr('y1', y(0))
                .attr('x2', x(boundaryX)).attr('y2', y(1))
                .attr('stroke', 'white').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4')
                .attr('opacity', 1);
        } else {
            chartArea.select('.boundary-line').attr('opacity', 0);
        }

        // Logistic Curve
        const line = d3.line<number>().x(d => x(d)).y(d => y(predictLogisticProbability(d, curveParams)));
        chartArea.select('.logistic-curve')
            .datum(d3.range(0, 100, 0.5))
            .attr('fill', 'none').attr('stroke', 'rgb(56 189 248)').attr('stroke-width', 2.5)
            .attr('d', line);

        // Drag Behavior
        const drag = d3.drag<SVGCircleElement, LogisticPoint>()
            .subject(function(event, d) {
                 // Fix for jumping issue
                 return { x: x(d.x), y: y(d.outcome) };
            })
            .on('start', function() { d3.select(this).raise().attr('r', 8); })
            .on('drag', function (event, d) {
                const newX = Math.max(0, Math.min(100, x.invert(event.x)));
                const newOutcome = y.invert(event.y) > 0.5 ? 1 : 0;
                d3.select(this).attr('cx', x(newX)).attr('cy', y(newOutcome));
                onUpdatePoint(d.id, newX, newOutcome);
            })
            .on('end', function() { d3.select(this).attr('r', 6); });

        // Update Points
        chartArea.select('.points-layer').selectAll('circle')
            .data(data, (d: any) => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 6)
                    .attr('fill', d => d.outcome === 1 ? 'rgb(34 211 238)' : 'rgb(236 72 153)')
                    .attr('stroke', 'rgb(15 23 42)')
                    .attr('stroke-width', 2)
                    .style('cursor', 'pointer')
                    .call(drag), // Drag only on enter
                update => update
                    .attr('cx', d => x(d.x))
                    .attr('cy', d => y(d.outcome))
                    .attr('fill', d => d.outcome === 1 ? 'rgb(34 211 238)' : 'rgb(236 72 153)')
                    .attr('r', d => d.id === selectedPointId ? 8 : 6)
                    .attr('stroke', d => d.id === selectedPointId ? 'white' : 'rgb(15 23 42)'),
                    // Drag is NOT re-attached here
                exit => exit.remove()
            )
            .on('click', (event, d) => {
                event.stopPropagation();
                onSelectPoint(d);
            });

    }, [data, curveParams, onUpdatePoint, onAddPoint, onSelectPoint, selectedPointId]);

    return <svg ref={svgRef}></svg>;
};

export default LogisticRegressionPlot;
