import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { DecisionTreeNode } from '../types';

interface DecisionTreeVisualizerProps {
    root: DecisionTreeNode;
    onNodeClick: (node: DecisionTreeNode) => void;
}

const DecisionTreeVisualizer: React.FC<DecisionTreeVisualizerProps> = ({ root, onNodeClick }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // FIX: The children accessor for d3.hierarchy must return null or undefined for leaf nodes, not an empty array.
    const hierarchy = useMemo(() => d3.hierarchy(root, d => (d.left || d.right) ? [d.left, d.right].filter((n): n is DecisionTreeNode => !!n) : null), [root]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const treeLayout = d3.tree<DecisionTreeNode>().size([width - 80, height - 80]);
        const treeData = treeLayout(hierarchy);

        const g = svg.append('g').attr('transform', 'translate(40, 40)');

        const linkGenerator = d3.linkVertical<any, d3.HierarchyPointNode<DecisionTreeNode>>()
            .x(d => d.x)
            .y(d => d.y);

        g.selectAll('path.link')
            .data(treeData.links())
            .join('path')
            .attr('class', 'link')
            .attr('d', linkGenerator)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(100 116 139)')
            .attr('stroke-width', 1.5);
            
        const nodes = g.selectAll('g.node')
            .data(treeData.descendants())
            .join('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        nodes.append('circle')
            .attr('r', 20)
            .attr('fill', d => d.data.value !== undefined ? (d.data.value === 0 ? 'rgb(34 211 238)' : 'rgb(236 72 153)') : 'rgb(51 65 85)')
            .attr('stroke', d => d.data.splitFeatureIndex !== undefined ? 'rgb(251 113 133)' : 'rgb(100 116 139)')
            .attr('stroke-width', 2)
            .style('cursor', d => d.data.splitFeatureIndex !== undefined ? 'pointer' : 'default')
            .on('click', (_, d) => {
                if(d.data.splitFeatureIndex !== undefined) onNodeClick(d.data);
            });

        nodes.append('text')
            .attr('dy', '0.31em')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'white')
            .style('pointer-events', 'none')
            .selectAll('tspan')
            .data(d => {
                const data = d.data;
                if (data.value !== undefined) {
                    return [`Class: ${data.value}`];
                }
                const feature = data.splitFeatureIndex === 0 ? 'X' : 'Y';
                return [`${feature} < ${data.splitThreshold?.toFixed(1)}`, `gini=${data.gini?.toFixed(2)}`, `n=${data.samples}`];
            })
            .join('tspan')
            .attr('x', 0)
            .attr('y', (_, i, arr) => `${(i - (arr.length - 1) / 2) * 1.1}em`)
            .text(d => d);

    }, [root, hierarchy, onNodeClick]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default DecisionTreeVisualizer;