import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { SEMModel, SEMVariable, SEMPath } from '../types';

interface PathDiagramProps {
    model: SEMModel;
    onPathToggle: (pathId: string) => void;
}

const PathDiagram: React.FC<PathDiagramProps> = ({ model, onPathToggle }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const { nodes, links } = useMemo(() => {
        return {
            nodes: model.variables,
            links: model.paths
        }
    }, [model]);

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 500;
        const height = 500;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);
        
        // --- DEFS for markers ---
        svg.append('defs').selectAll('marker')
            .data(['arrowhead', 'arrowhead-specified'])
            .join('marker')
                .attr('id', String)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 10)
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
            .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', d => d.includes('specified') ? 'rgb(249 115 22)' : 'rgb(100 116 139)');

        const g = svg.append('g');
        const linkGroup = g.append('g').attr('class', 'links');
        const nodeGroup = g.append('g').attr('class', 'nodes');

        const findNode = (id: string) => nodes.find(n => n.id === id);

        // --- LINKS ---
        linkGroup.selectAll('path')
            .data(links)
            .join('path')
            .attr('id', d => `path-${d.id}`)
            .attr('stroke', d => d.specified ? 'rgb(249 115 22)' : 'rgb(100 116 139)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d.isStructural && !d.specified ? '5,5' : 'none')
            .attr('fill', 'none')
            .attr('marker-end', d => d.type !== 'covariance' ? (d.specified ? 'url(#arrowhead-specified)' : 'url(#arrowhead)') : 'none')
            .attr('marker-start', d => d.type === 'covariance' ? (d.specified ? 'url(#arrowhead-specified)' : 'url(#arrowhead)') : 'none')
            .style('cursor', d => d.isStructural ? 'pointer' : 'default')
            .on('click', (_, d) => {
                if(d.isStructural) onPathToggle(d.id);
            })
            .attr('d', d => {
                const source = findNode(d.from);
                const target = findNode(d.to);
                if (!source || !target || !source.x || !source.y || !target.x || !target.y) return '';
                
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = d.type === 'covariance' ? Math.sqrt(dx * dx + dy * dy) * 1.5 : 0;
                
                // Adjust start/end points to be on the edge of the node, not the center
                const angle = Math.atan2(dy, dx);
                const sourcePadding = (source.type === 'latent' ? 40 : 35); // oval vs rect
                const targetPadding = (target.type === 'latent' ? 40 : 35);

                const sx = source.x + Math.cos(angle) * sourcePadding;
                const sy = source.y + Math.sin(angle) * sourcePadding;
                const tx = target.x - Math.cos(angle) * targetPadding;
                const ty = target.y - Math.sin(angle) * targetPadding;

                if (d.type === 'covariance') {
                     return `M ${sx} ${sy} A ${dr} ${dr} 0 0 1 ${tx} ${ty}`;
                }
                return `M ${sx} ${sy} L ${tx} ${ty}`;
            });


        // --- NODES ---
        const node = nodeGroup.selectAll('g')
            .data(nodes)
            .join('g')
            .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);
        
        // Latent variables (ovals)
        node.filter(d => d.type === 'latent')
            .append('ellipse')
            .attr('rx', 40)
            .attr('ry', 25)
            .attr('fill', 'rgb(30 41 59)')
            .attr('stroke', 'rgb(100 116 139)')
            .attr('stroke-width', 2);
            
        // Observed variables (rects)
        node.filter(d => d.type === 'observed')
            .append('rect')
            .attr('x', -30)
            .attr('y', -15)
            .attr('width', 60)
            .attr('height', 30)
            .attr('fill', 'rgb(30 41 59)')
            .attr('stroke', 'rgb(100 116 139)')
            .attr('stroke-width', 2);

        // Node labels
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', 'white')
            .style('font-size', '14px')
            .text(d => d.label);

    }, [nodes, links, onPathToggle]);

    return <svg ref={svgRef}></svg>;
};

export default PathDiagram;