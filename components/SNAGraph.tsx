
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { SNANode, SNALink } from '../types';

// FIX: Define a type that combines SNANode with D3's SimulationNodeDatum to satisfy D3's requirements.
type SimulationNode = SNANode & d3.SimulationNodeDatum;

interface SNAGraphProps {
    nodes: SNANode[];
    links: SNALink[];
    selectedNodeId: number | null;
    onNodeClick: (nodeId: number | null) => void;
}

const SNAGraph: React.FC<SNAGraphProps> = ({ nodes, links, selectedNodeId, onNodeClick }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    // FIX: Expected 1 arguments, but got 0. Initialize useRef with null.
    // FIX: Use the new SimulationNode type for the simulation's node generic type.
    const simulationRef = useRef<d3.Simulation<SimulationNode, SNALink> | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 500;
        const height = 500;
        const svg = d3.select(svgRef.current).attr('viewBox', `0 0 ${width} ${height}`);
        
        svg.on('click', () => onNodeClick(null));

        const g = svg.append('g');
        const linkGroup = g.append('g').attr('class', 'links');
        const nodeGroup = g.append('g').attr('class', 'nodes');

        // FIX: The simulation is created with the extended node type, resolving type incompatibilities.
        simulationRef.current = d3.forceSimulation<SimulationNode>()
            // FIX: The link force also uses the extended node type.
            .force('link', d3.forceLink<SimulationNode, SNALink>().id((d:any) => d.id).distance(60))
            .force('charge', d3.forceManyBody().strength(-150))
            .force('center', d3.forceCenter(width / 2, height / 2));
        
        const ticked = () => {
            linkGroup.selectAll<SVGPathElement, SNALink>('path')
                .attr('d', (d: any) => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
            // FIX: The node data type is now SimulationNode.
            nodeGroup.selectAll<SVGGElement, SimulationNode>('g')
                .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        };

        simulationRef.current.on('tick', ticked);

    }, [onNodeClick]);

    useEffect(() => {
        if (!simulationRef.current || !svgRef.current) return;

        const simulation = simulationRef.current;
        const svg = d3.select(svgRef.current);
        const linkGroup = svg.select('.links');
        const nodeGroup = svg.select('.nodes');
        
        // FIX: Cast nodes to SimulationNode[] for the simulation, as D3 will add the required properties.
        simulation.nodes(nodes as SimulationNode[]);
        // FIX: The link force also uses the extended node type.
        const linkForce = simulation.force('link') as d3.ForceLink<SimulationNode, SNALink>;
        if (linkForce) {
            linkForce.links(links);
        }
        
        const link = linkGroup
            .selectAll<SVGPathElement, SNALink>('path')
            .data(links, d => `${d.source}-${d.target}-${d.time}`);
        
        link.enter().append('path')
            .attr('stroke', 'rgba(100, 116, 139, 0.5)')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0)
            .transition().duration(500)
            .attr('opacity', 1);

        link.exit().remove();
        
        // FIX: The node data type is now SimulationNode, and we cast the incoming data.
        const node = nodeGroup
            .selectAll<SVGGElement, SimulationNode>('g')
            .data(nodes as SimulationNode[], (d: any) => d.id);

        const nodeEnter = node.enter().append('g')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                onNodeClick(d.id);
            })
            .call(d3.drag<any, SimulationNode>()
                .on("start", (event) => { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
                .on("drag", (event) => { event.subject.fx = event.x; event.subject.fy = event.y; })
                .on("end", (event) => { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; })
            );

        nodeEnter.append('circle').attr('fill', 'rgb(34 211 238)').attr('r', 0)
          .transition().duration(500)
            .attr('r', d => 5 + Math.sqrt(d.degree) * 2);

        nodeEnter.append('text').text(d => d.id)
            .attr('text-anchor', 'middle').attr('dy', 4)
            .style('font-size', '10px').style('fill', 'white');
        
        node.select('circle')
            .transition().duration(200)
            .attr('r', d => 5 + Math.sqrt(d.degree) * 2);

        node.exit().select('circle').transition().duration(500).attr('r', 0).remove();
        node.exit().select('text').remove();
        node.exit().transition().duration(500).remove();
        
        simulation.alpha(0.3).restart();

    }, [nodes, links, onNodeClick]);
    
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);

        const isConnected = (a: number, b: number) => {
            const linkSet = new Set(links.map(l => `${l.source.toString()}-${l.target.toString()}`));
            return linkSet.has(`${a}-${b}`) || linkSet.has(`${b}-${a}`);
        }
        
        // FIX: The node data type is now SimulationNode.
        const allNodes = svg.selectAll<SVGGElement, SimulationNode>('.nodes g');
        const allLinks = svg.selectAll<SVGPathElement, SNALink>('.links path');

        if (selectedNodeId === null) {
            allNodes.select('circle').attr('fill', 'rgb(34 211 238)');
            allLinks.attr('stroke', 'rgba(100, 116, 139, 0.5)');
        } else {
            allNodes.select('circle').attr('fill', d => {
                if (d.id === selectedNodeId) return 'rgb(236 72 153)'; // Highlight color
                return isConnected(selectedNodeId, d.id) ? 'rgb(56 189 248)' : 'rgb(51 65 85)'; // Neighbor or faded
            });
            allLinks.attr('stroke', (d: any) =>
                (d.source.id === selectedNodeId || d.target.id === selectedNodeId)
                ? 'rgb(236 72 153)' : 'rgba(100, 116, 139, 0.1)'
            );
        }

    }, [selectedNodeId, links]);


    return <svg ref={svgRef}></svg>;
};

export default SNAGraph;
