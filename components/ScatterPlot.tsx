
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Point, RegressionLine } from '../types';
import { logEvent } from '../services/loggingService';

interface ScatterPlotProps {
    data: Point[];
    line: RegressionLine;
    onPointUpdate: (id: number, newX: number, newY: number) => void;
    xAxisLabel?: string;
    yAxisLabel?: string;
}

const ScatterPlot: React.FC<ScatterPlotProps> = ({ 
    data, 
    line, 
    onPointUpdate,
    xAxisLabel = "X Variable",
    yAxisLabel = "Y Variable"
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Cleanup any existing tooltips to prevent duplicates
        d3.selectAll('.scatter-tooltip').remove();

        // Create Tooltip Div
        const tooltip = d3.select('body').append('div')
            .attr('class', 'scatter-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', 'rgba(15, 23, 42, 0.95)')
            .style('color', '#f1f5f9')
            .style('padding', '8px 12px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('font-family', 'monospace')
            .style('pointer-events', 'none')
            .style('z-index', '9999')
            .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.5)')
            .style('border', '1px solid rgba(148, 163, 184, 0.2)')
            .style('transform', 'translate(10px, -50%)'); // Offset from cursor

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 50, left: 50 };

        svg.attr('width', width).attr('height', height);

        // Initialize layers if they don't exist
        if (svg.select('.bg-layer').empty()) {
            svg.append('rect').attr('class', 'bg-layer')
                .attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');
            svg.append('g').attr('class', 'grid-x');
            svg.append('g').attr('class', 'grid-y');
            svg.append('g').attr('class', 'x-axis');
            svg.append('g').attr('class', 'y-axis');
            svg.append('line').attr('class', 'regression-line');
            svg.append('g').attr('class', 'points-layer');
            
            // Add labels
            svg.append('text')
                .attr('class', 'x-label')
                .attr('text-anchor', 'middle')
                .attr('fill', 'rgb(148 163 184)')
                .style('font-size', '14px');

            svg.append('text')
                .attr('class', 'y-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'rgb(148 163 184)')
                .style('font-size', '14px');
        }

        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([height - margin.bottom, margin.top]);

        // Update Labels
        svg.select('.x-label')
            .attr('x', width / 2 + margin.left / 2)
            .attr('y', height - 15)
            .text(xAxisLabel);

        svg.select('.y-label')
            .attr('y', 15)
            .attr('x', -(height / 2) + margin.top / 2)
            .text(yAxisLabel);

        // Update Axes and Grid
        svg.select<SVGGElement>('.x-axis')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');

        svg.select<SVGGElement>('.y-axis')
            .attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y))
            .attr('color', 'rgb(100 116 139)');

        svg.select<SVGGElement>('.grid-x')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
            .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        svg.select<SVGGElement>('.grid-y')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(10).tickSize(-width + margin.left + margin.right).tickFormat(() => ''))
            .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');


        // Update Regression Line
        const x1 = 0, y1 = line.slope * x1 + line.intercept;
        const x2 = 100, y2 = line.slope * x2 + line.intercept;
        
        svg.select('.regression-line')
            .attr('x1', x(x1))
            .attr('y1', y(y1))
            .attr('x2', x(x2))
            .attr('y2', y(y2))
            .attr('stroke', 'rgb(34 211 238)')
            .attr('stroke-width', 2)
            .attr('opacity', 0.5);

        // Drag Behavior
        const drag = d3.drag<SVGCircleElement, Point>()
            .subject(function(event, d) {
                return { x: x(d.x), y: y(d.y) };
            })
            .on('start', function() {
                d3.select(this).attr('stroke', 'white').attr('stroke-width', 3).raise();
                // Select tooltip globally to handle closure issues if it was recreated
                d3.select('.scatter-tooltip').style('visibility', 'hidden'); 
            })
            .on('drag', function (event, d) {
                const newX = Math.max(0, Math.min(100, x.invert(event.x)));
                const newY = Math.max(0, Math.min(100, y.invert(event.y)));
                d3.select(this).attr('cx', x(newX)).attr('cy', y(newY));
                onPointUpdate(d.id, newX, newY);
            })
            .on('end', function(event, d) {
                 d3.select(this).attr('stroke', 'rgb(15 23 42)').attr('stroke-width', 2);
                 const finalX = Math.max(0, Math.min(100, x.invert(event.x)));
                 const finalY = Math.max(0, Math.min(100, y.invert(event.y)));
                 logEvent('point_drag_end', 'ScatterPlot', { point_id: d.id, x: finalX, y: finalY });
            });

        // Update Points using join
        const points = svg.select('.points-layer')
            .selectAll<SVGCircleElement, Point>('circle')
            .data(data, d => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 6)
                    .attr('fill', 'rgb(34 211 238)')
                    .attr('stroke', 'rgb(15 23 42)')
                    .attr('stroke-width', 2)
                    .style('cursor', 'grab')
                    .call(drag), // Attach drag behavior ONLY on enter to prevent re-initialization jumps
                update => update
                    .attr('cx', d => x(d.x))
                    .attr('cy', d => y(d.y)),
                exit => exit.remove()
            );
            
        // Attach hover events to merged selection to ensure they reference the latest tooltip closure
        points
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 9)
                    .attr('fill', 'rgb(103 232 249)'); // Lighter cyan highlight
                
                // Tooltip logic uses current render's tooltip variable
                tooltip
                    .style('visibility', 'visible')
                    .html(`
                        <div class="font-bold mb-1 border-b border-slate-600 pb-1">Data Point</div>
                        <div class="flex justify-between gap-4"><span>X:</span> <span class="font-mono text-cyan-300">${d.x.toFixed(1)}</span></div>
                        <div class="flex justify-between gap-4"><span>Y:</span> <span class="font-mono text-cyan-300">${d.y.toFixed(1)}</span></div>
                    `);
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('top', (event.pageY) + 'px')
                    .style('left', (event.pageX) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 6)
                    .attr('fill', 'rgb(34 211 238)');
                tooltip.style('visibility', 'hidden');
            });

        // Cleanup function to remove tooltip when component unmounts
        return () => {
            tooltip.remove();
        }

    }, [data, line, onPointUpdate, xAxisLabel, yAxisLabel]);

    return <svg ref={svgRef}></svg>;
};

export default ScatterPlot;
