import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { LagAnalysisResult, StudentAction } from '../types';

interface TransitionGraphProps {
    title: string;
    result: LagAnalysisResult;
    actions: StudentAction[];
}

const actionMap: Record<StudentAction, { emoji: string; name: string }> = {
    V: { emoji: '▶️', name: 'Video' },
    Q: { emoji: '❓', name: 'Quiz' },
    A: { emoji: '📝', name: 'Assignment' },
    F: { emoji: '💬', name: 'Forum' },
    P: { emoji: '✅', name: 'Pass' },
    E: { emoji: '❌', name: 'Fail/Error' },
};

// FIX: Define a type that combines the local node data with D3's simulation data for type safety.
type SimulationNode = { id: StudentAction } & d3.SimulationNodeDatum;

const TransitionGraph: React.FC<TransitionGraphProps> = ({ title, result, actions }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { nodes, links } = useMemo(() => {
        const nodes = actions.map(id => ({ id }));
        const links: { source: string; target: string; z: number }[] = [];
        const significanceThreshold = 1.96; // Z-score for p < 0.05

        for (const from of actions) {
            for (const to of actions) {
                const z = result.zScores[from]?.[to] || 0;
                if (Math.abs(z) > significanceThreshold) {
                    links.push({ source: from, target: to, z });
                }
            }
        }
        return { nodes, links };
    }, [result, actions]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const simulation = d3.forceSimulation(nodes as SimulationNode[])
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2));
            
        svg.append('defs').selectAll('marker')
            .data(['positive', 'negative'])
            .join('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 28)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', d => d === 'positive' ? 'rgb(59 130 246)' : 'rgb(239 68 68)');

        const link = svg.append('g').selectAll('path')
            .data(links)
            .join('path')
            .attr('stroke-width', d => Math.min(Math.abs(d.z) / 2, 5))
            .attr('stroke', d => d.z > 0 ? 'rgb(59 130 246)' : 'rgb(239 68 68)')
            .attr('marker-end', d => d.z > 0 ? 'url(#arrow-positive)' : 'url(#arrow-negative)');

        const node = svg.append('g').selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag<any, SimulationNode>()
                .on("start", (event) => { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
                .on("drag", (event) => { event.subject.fx = event.x; event.subject.fy = event.y; })
                .on("end", (event) => { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; })
            );

        node.append('circle').attr('r', 20).attr('fill', 'rgb(30 41 59)').attr('stroke', 'rgb(100 116 139)').attr('stroke-width', 2);
        node.append('text').attr('text-anchor', 'middle').attr('dy', 5).style('font-size', '20px').text(d => actionMap[d.id as StudentAction].emoji);

        simulation.on('tick', () => {
            link.attr('d', (d: any) => {
                const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
                const dr = d.source.id === d.target.id ? 50 : 0; // self-loop
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            // FIX: Use the SimulationNode type, which includes x and y properties, to resolve the type error.
            node.attr('transform', (d: SimulationNode) => `translate(${d.x},${d.y})`);
        });

    }, [nodes, links]);

    return (
        <div className="w-full h-full flex flex-col items-center">
            <h4 className="text-lg font-semibold text-center text-slate-300 mb-2">{title}</h4>
            <div ref={containerRef} className="w-full flex-grow">
                <svg ref={svgRef}></svg>
            </div>
        </div>
    );
};

export default TransitionGraph;