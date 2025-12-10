import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { DecisionTreePoint, DecisionTreeNode } from '../types';

interface DecisionBoundaryPlotProps {
    data: DecisionTreePoint[];
    tree: DecisionTreeNode;
}

const DecisionBoundaryPlot: React.FC<DecisionBoundaryPlotProps> = ({ data, tree }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 400;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        svg.selectAll('*').remove();

        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');

        const boundaryGroup = svg.append('g');
        
        // Recursive function to draw boundaries
        const drawBoundaries = (node: DecisionTreeNode, bounds: {xMin: number, xMax: number, yMin: number, yMax: number}) => {
            if (node.value !== undefined) {
                boundaryGroup.append('rect')
                    .attr('x', x(bounds.xMin))
                    .attr('y', y(bounds.yMax))
                    .attr('width', x(bounds.xMax) - x(bounds.xMin))
                    .attr('height', y(bounds.yMin) - y(bounds.yMax))
                    .attr('fill', node.value === 0 ? 'rgb(34 211 238)' : 'rgb(236 72 153)')
                    .attr('opacity', 0.2);
                return;
            }

            if (node.left) {
                const newBounds = {...bounds};
                if (node.splitFeatureIndex === 0) {
                    newBounds.xMax = node.splitThreshold!;
                } else {
                    newBounds.yMax = node.splitThreshold!;
                }
                drawBoundaries(node.left, newBounds);
            }
            if (node.right) {
                 const newBounds = {...bounds};
                if (node.splitFeatureIndex === 0) {
                    newBounds.xMin = node.splitThreshold!;
                } else {
                    newBounds.yMin = node.splitThreshold!;
                }
                drawBoundaries(node.right, newBounds);
            }
        };

        drawBoundaries(tree, {xMin: 0, xMax: 100, yMin: 0, yMax: 100});

        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');

        // Points
        svg.append('g')
            .selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.features[0]))
            .attr('cy', d => y(d.features[1]))
            .attr('r', 3)
            .attr('fill', d => d.label === 0 ? 'rgb(34 211 238)' : 'rgb(236 72 153)')
            .attr('stroke', 'rgb(15 23 42)');

    }, [data, tree]);

    return <svg ref={svgRef}></svg>;
};

export default DecisionBoundaryPlot;