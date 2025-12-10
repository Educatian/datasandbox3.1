import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { PSMDataPoint } from '../types';

interface PSMComparisonPlotProps {
    data: PSMDataPoint[];
    isMatched: boolean;
}

const PSMComparisonPlot: React.FC<PSMComparisonPlotProps> = ({ data, isMatched }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const { treatmentData, controlData } = useMemo(() => {
        return {
            treatmentData: data.filter(d => d.group === 'Treatment'),
            controlData: data.filter(d => d.group === 'Control'),
        };
    }, [data]);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        const width = 500;
        const height = 500;
        const margin = { top: 40, right: 20, bottom: 40, left: 20 };
        const plotHeight = (height - margin.top - margin.bottom) / 2 - 20;

        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([margin.left, width - margin.right]);

        // --- Create beeswarm layouts ---
        const createSwarm = (groupData: PSMDataPoint[], yOffset: number) => {
            const simulation = d3.forceSimulation(groupData as d3.SimulationNodeDatum[])
                .force('x', d3.forceX((d: any) => x(d.priorScore)).strength(1))
                .force('y', d3.forceY(yOffset))
                .force('collide', d3.forceCollide(4))
                .stop();
            
            for (let i = 0; i < 120; ++i) simulation.tick();
            return groupData;
        };
        
        const treatmentLayout = createSwarm(treatmentData, margin.top + plotHeight / 2);
        const controlLayout = createSwarm(controlData, margin.top + plotHeight + 40 + plotHeight / 2);

        const allLayoutData = [...treatmentLayout, ...controlLayout];

        // --- Axes and Labels ---
        svg.append('g')
            .attr('transform', `translate(0, ${margin.top + plotHeight})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');
        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');

        svg.append('text').attr('x', 10).attr('y', 20).text('Treatment Group').attr('fill', 'rgb(236 72 153)');
        svg.append('text').attr('x', 10).attr('y', height - 10).text('Control Group').attr('fill', 'rgb(34 211 238)');
        svg.append('text').attr('x', width/2).attr('y', height-margin.bottom+35).text('Prior Score').attr('fill', 'rgb(156 163 175)').attr('text-anchor', 'middle');

        // --- Matching Lines ---
        const matches = data.filter(d => d.isMatched && d.group === 'Treatment');
        const matchData = matches.map(treat => {
            const control = allLayoutData.find(d => d.id === treat.matchedWithId);
            const treatment = allLayoutData.find(d => d.id === treat.id);
            return { treatment, control };
        }).filter(p => p.treatment && p.control);
        
        const lines = svg.append('g').selectAll('line')
            .data(matchData)
            .join('line')
            .attr('x1', d => (d.treatment as any).x)
            .attr('y1', d => (d.treatment as any).y)
            .attr('x2', d => (d.control as any).x)
            .attr('y2', d => (d.control as any).y)
            .attr('stroke', 'rgb(100 116 139)')
            .attr('stroke-width', 1)
            .attr('opacity', isMatched ? 0.5 : 0);
            
        lines.transition()
            .duration(1000)
            .attr('opacity', isMatched ? 0.5 : 0);

        // --- Points ---
        const points = svg.append('g').selectAll('circle')
            .data(allLayoutData, (d: any) => d.id)
            .join('circle')
            .attr('cx', d => (d as any).x)
            .attr('cy', d => (d as any).y)
            .attr('r', 3)
            .attr('fill', d => d.group === 'Treatment' ? 'rgb(236 72 153)' : 'rgb(34 211 238)');

        points.transition()
            .duration(1000)
            .attr('opacity', d => isMatched ? (d.isMatched ? 1 : 0.2) : 1);
            
    }, [data, isMatched, treatmentData, controlData]);

    return <svg ref={svgRef}></svg>;
};

export default PSMComparisonPlot;