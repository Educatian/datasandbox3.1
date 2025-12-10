
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ResidualPoint, RegressionLine } from '../types';

interface RegressionScatterPlotProps {
    data: ResidualPoint[];
    line: RegressionLine;
    onPointUpdate: (id: number, newX: number, newY: number) => void;
    onAddPoint: (x: number, y: number) => void;
    showSquares: boolean;
    showMeanLine: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
}

const RegressionScatterPlot: React.FC<RegressionScatterPlotProps> = ({ 
    data, line, onPointUpdate, onAddPoint, showSquares, showMeanLine,
    xAxisLabel = "Independent Variable (X)", yAxisLabel = "Dependent Variable (Y)"
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Cleanup any existing tooltips
        d3.selectAll('.regression-tooltip').remove();

        // Create Tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'regression-tooltip')
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
            .style('transform', 'translate(10px, -50%)');

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 30, right: 20, bottom: 50, left: 60 }; // Increased margins for labels

        svg.attr('width', width).attr('height', height);

        // Initialize layers
        if (svg.select('.bg-layer').empty()) {
            const background = svg.append('rect')
                .attr('class', 'bg-layer')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'rgb(30 41 59)')
                .style('cursor', 'crosshair');
            
            svg.append('g').attr('class', 'grid-x');
            svg.append('g').attr('class', 'grid-y');
            svg.append('g').attr('class', 'x-axis');
            svg.append('g').attr('class', 'y-axis');
            
            // Axis Labels
            svg.append('text').attr('class', 'x-label')
                .attr('text-anchor', 'middle')
                .attr('fill', 'rgb(148 163 184)')
                .style('font-size', '14px');

            svg.append('text').attr('class', 'y-label')
                .attr('text-anchor', 'middle')
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'rgb(148 163 184)')
                .style('font-size', '14px');

            // Chart area with clip
            const chartArea = svg.append('g').attr('class', 'chart-area');
            svg.append('defs').append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                .attr('width', width - margin.left - margin.right)
                .attr('height', height - margin.top - margin.bottom)
                .attr('x', margin.left)
                .attr('y', margin.top);
            
            chartArea.attr('clip-path', 'url(#clip)');
            
            // Layer Order: Squares -> Mean Line -> Residuals -> Reg Line -> Points
            chartArea.append('g').attr('class', 'squares-layer');
            chartArea.append('line').attr('class', 'mean-line').attr('opacity', 0);
            chartArea.append('g').attr('class', 'residuals-layer');
            chartArea.append('line').attr('class', 'regression-line');
            chartArea.append('text').attr('class', 'equation-text');
            chartArea.append('g').attr('class', 'points-layer');
        }

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        // Update Background Click Listener
        svg.select('.bg-layer').on('click', (event) => {
            const [pointerX, pointerY] = d3.pointer(event);
            if (pointerX > margin.left && pointerX < width - margin.right && pointerY > margin.top && pointerY < height - margin.bottom) {
                const newX = x.invert(pointerX);
                const newY = y.invert(pointerY);
                onAddPoint(newX, newY);
            }
        });

        // Update Axes Labels
        svg.select('.x-label')
            .attr('x', width / 2 + margin.left / 2)
            .attr('y', height - 15)
            .text(xAxisLabel);

        svg.select('.y-label')
            .attr('y', 20)
            .attr('x', -(height / 2) + margin.top / 2)
            .text(yAxisLabel);

        // Update Axes and Grid
        svg.select<SVGGElement>('.x-axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.select<SVGGElement>('.y-axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        
        svg.select<SVGGElement>('.grid-x').attr('transform', `translate(0,${height - margin.bottom})`)
           .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
           .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');
           
        svg.select<SVGGElement>('.grid-y').attr('transform', `translate(${margin.left},0)`)
           .call(d3.axisLeft(y).ticks(10).tickSize(-width + margin.left + margin.right).tickFormat(() => ''))
           .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const chartArea = svg.select('.chart-area');

        // Calculate mean Y for baseline
        const meanY = data.length > 0 ? d3.mean(data, d => d.y) || 50 : 50;

        // Update Mean Line
        chartArea.select('.mean-line')
            .transition().duration(300)
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', y(meanY))
            .attr('y2', y(meanY))
            .attr('stroke', 'rgb(59 130 246)') // Blue-500
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', showMeanLine ? 0.6 : 0);

        // Update Squares (Visualization of Least Squares)
        const squaresGroup = chartArea.select('.squares-layer');
        if (showSquares) {
            squaresGroup.selectAll('rect.residual-square')
                .data(data, (d: any) => d.id)
                .join('rect')
                .attr('class', 'residual-square')
                .attr('fill', 'rgba(234, 179, 8, 0.15)') // Yellow with low opacity
                .attr('stroke', 'rgba(234, 179, 8, 0.3)')
                .attr('stroke-width', 1)
                .attr('x', d => x(d.x)) 
                .attr('y', d => Math.min(y(d.y), y(d.yHat)))
                .attr('width', d => Math.abs(y(d.y) - y(d.yHat))) // visual width in pixels
                .attr('height', d => Math.abs(y(d.y) - y(d.yHat))); // visual height in pixels
        } else {
            squaresGroup.selectAll('rect.residual-square').remove();
        }

        // Update Residuals
        chartArea.select('.residuals-layer')
            .selectAll('line.residual')
            .data(data, (d: any) => d.id)
            .join('line')
            .attr('class', 'residual')
            .attr('x1', d => x(d.x))
            .attr('y1', d => y(d.y))
            .attr('x2', d => x(d.x))
            .attr('y2', d => y(d.yHat))
            .attr('stroke', 'rgba(255, 100, 100, 0.5)')
            .attr('stroke-width', 1.5);

        // Update Regression Line
        const x1 = 0, y1 = line.slope * x1 + line.intercept;
        const x2 = 100, y2 = line.slope * x2 + line.intercept;
        
        chartArea.select('.regression-line')
            .transition().duration(50) // Fast transition for drag responsiveness
            .attr('x1', x(x1)).attr('y1', y(y1))
            .attr('x2', x(x2)).attr('y2', y(y2))
            .attr('stroke', 'rgb(250 204 21)') // Yellow-400
            .attr('stroke-width', 3);
            
        // Update Equation Text
        const slopeText = line.slope.toFixed(2);
        const interceptText = line.intercept >= 0 ? `+ ${line.intercept.toFixed(2)}` : `- ${Math.abs(line.intercept).toFixed(2)}`;
        
        // Position text along the line but keep it within view
        let textX = 70;
        let textY = line.slope * 70 + line.intercept;
        
        // Clamp Y to stay in chart area
        if (textY > 90) { textY = 90; textX = (90 - line.intercept) / (line.slope || 0.001); }
        if (textY < 10) { textY = 10; textX = (10 - line.intercept) / (line.slope || 0.001); }
        
        // Clamp X
        textX = Math.max(10, Math.min(90, textX));

        chartArea.select('.equation-text')
            .transition().duration(50)
            .attr('x', x(textX))
            .attr('y', y(textY) - 15)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgb(250 204 21)')
            .style('font-family', 'monospace')
            .style('font-weight', 'bold')
            .style('font-size', '14px')
            .style('text-shadow', '0px 0px 4px rgba(0,0,0,0.8)')
            .text(`y = ${slopeText}x ${interceptText}`);


        // Drag Behavior
        const drag = d3.drag<SVGCircleElement, ResidualPoint>()
            .subject(function(event, d) {
                // Fix for jumping issue: define subject in pixel coordinates
                return { x: x(d.x), y: y(d.y) };
            })
            .on('start', function() {
                d3.select(this).attr('r', 8).attr('stroke', 'white');
                tooltip.style('visibility', 'hidden');
            })
            .on('drag', function (event, d) {
                const newX = Math.max(0, Math.min(100, x.invert(event.x)));
                const newY = Math.max(0, Math.min(100, y.invert(event.y)));
                d3.select(this).attr('cx', x(newX)).attr('cy', y(newY));
                onPointUpdate(d.id, newX, newY); 
            })
            .on('end', function() { d3.select(this).attr('r', 6).attr('stroke', 'rgb(15 23 42)'); });

        // Update Points
        chartArea.select('.points-layer')
            .selectAll('circle')
            .data(data, (d: any) => d.id)
            .join(
                enter => enter.append('circle')
                    .attr('r', 6)
                    .attr('fill', 'rgb(34 211 238)')
                    .attr('stroke', 'rgb(15 23 42)')
                    .attr('stroke-width', 2)
                    .style('cursor', 'grab'),
                update => update
                    .attr('cx', d => x(d.x))
                    .attr('cy', d => y(d.y)),
                exit => exit.remove()
            )
            // Attach drag and events on the merged selection
            .call(drag)
            .on('mouseover', function(event, d) {
                const yHat = line.slope * d.x + line.intercept;
                const residual = d.y - yHat;
                
                d3.select(this)
                    .transition().duration(200)
                    .attr('r', 9)
                    .attr('fill', 'rgb(250 204 21)'); // Yellow highlight for regression highlights

                tooltip.style('visibility', 'visible')
                    .html(`
                        <div class="font-bold mb-1 border-b border-slate-600 pb-1 text-slate-200">Data Point</div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span class="text-slate-400">X:</span> <span class="font-mono text-cyan-300 text-right">${d.x.toFixed(1)}</span>
                            <span class="text-slate-400">Y:</span> <span class="font-mono text-cyan-300 text-right">${d.y.toFixed(1)}</span>
                            <span class="text-slate-400">Pred Y:</span> <span class="font-mono text-yellow-300 text-right">${yHat.toFixed(1)}</span>
                            <span class="text-slate-400">Error:</span> <span class="font-mono ${residual < 0 ? 'text-red-400' : 'text-green-400'} text-right">${residual.toFixed(1)}</span>
                        </div>
                    `);
            })
            .on('mousemove', (event) => {
                tooltip
                    .style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
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

    }, [data, line, onPointUpdate, onAddPoint, showSquares, showMeanLine, xAxisLabel, yAxisLabel]);

    return <svg ref={svgRef}></svg>;
};

export default RegressionScatterPlot;
