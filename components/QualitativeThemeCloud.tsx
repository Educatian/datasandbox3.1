import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { QualitativeTheme } from '../types';

interface QualitativeThemeCloudProps {
    themes: QualitativeTheme[];
    selectedTheme: QualitativeTheme | null;
    onThemeSelect: (theme: QualitativeTheme | null) => void;
}

type SimulationNode = QualitativeTheme & d3.SimulationNodeDatum;

const QualitativeThemeCloud: React.FC<QualitativeThemeCloudProps> = ({ themes, selectedTheme, onThemeSelect }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const fontScale = useMemo(() => {
        if (themes.length === 0) return d3.scaleLinear().domain([0,1]).range([14, 48]);
        const freqs = themes.map(t => t.frequency);
        return d3.scaleLinear()
            .domain(d3.extent(freqs) as [number, number])
            .range([14, 48]); // min and max font size
    }, [themes]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || themes.length === 0) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const simulation = d3.forceSimulation(themes as SimulationNode[])
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide(d => fontScale((d as SimulationNode).frequency) * 0.6 + 8).strength(0.8))
            .force('x', d3.forceX(width / 2).strength(0.05))
            .force('y', d3.forceY(height / 2).strength(0.05))
            .stop();
        
        // Run simulation for a bit to get a starting layout
        for (let i = 0; i < 120; ++i) simulation.tick();

        const themeNodes = svg.append('g')
            .selectAll('text')
            .data(themes as SimulationNode[])
            .join('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', d => `${fontScale(d.frequency)}px`)
            .style('font-weight', 600)
            .style('cursor', 'pointer')
            .text(d => d.text)
            .on('click', (_, d) => {
                onThemeSelect(selectedTheme?.text === d.text ? null : d);
            });
            
        themeNodes
            .transition().duration(750)
            .style('fill', d => selectedTheme?.text === d.text ? 'rgb(225 29 72)' : 'rgb(203 213 225)');

        const ticked = () => {
            themeNodes
                .attr('x', d => d.x!)
                .attr('y', d => d.y!);
        };
        
        simulation.on('tick', ticked);
        simulation.restart();

    }, [themes, selectedTheme, onThemeSelect, fontScale]);

    return (
        <div ref={containerRef} className="w-full h-full min-h-[350px]">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default QualitativeThemeCloud;
