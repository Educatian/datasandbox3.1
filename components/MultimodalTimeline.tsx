import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { MultimodalData, Bookmark, GazePoint } from '../types';

interface MultimodalTimelineProps {
    data: MultimodalData;
    bookmarks: Bookmark[];
    currentTime: number;
    onTimeChange: (time: number) => void;
    onBookmarkClick: (bookmark: Bookmark) => void;
}

const BOOKMARK_ICONS: Record<Bookmark['type'], string> = {
    convergence: '👀',
    dialogue: '💬',
    interaction: '🖱️',
};

const MultimodalTimeline: React.FC<MultimodalTimelineProps> = ({ data, bookmarks, currentTime, onTimeChange, onBookmarkClick }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const gazeConvergence = useMemo(() => {
        const convergence: { time: number; score: number }[] = [];
        for (let t = 0; t < data.duration; t += 0.5) {
            const p0Points = data.gaze.filter(d => d.participantId === 0 && d.time <= t);
            const p1Points = data.gaze.filter(d => d.participantId === 1 && d.time <= t);
            if (p0Points.length > 0 && p1Points.length > 0) {
                const p0 = p0Points[p0Points.length - 1];
                const p1 = p1Points[p1Points.length - 1];
                const distance = Math.sqrt(Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2));
                const score = Math.max(0, 1 - distance / 500); // Normalize score
                convergence.push({ time: t, score });
            }
        }
        return convergence;
    }, [data]);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;
        
        const { width } = containerRef.current.getBoundingClientRect();
        const height = 180;
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        const x = d3.scaleLinear()
            .domain([0, data.duration])
            .range([0, chartWidth]);

        // --- AXIS ---
        g.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x).ticks(10))
            .attr('color', 'rgb(100 116 139)');

        // --- SPEECH BARS ---
        const speechLanes = [
            { y: 0, height: 20, color: 'rgb(34 211 238)' },
            { y: 25, height: 20, color: 'rgb(236 72 153)' }
        ];
        g.append('g').selectAll('rect.speech')
            .data(data.speech)
            .join('rect')
            .attr('class', 'speech')
            .attr('x', d => x(d.startTime))
            .attr('y', d => speechLanes[d.participantId].y)
            .attr('width', d => x(d.endTime) - x(d.startTime))
            .attr('height', d => speechLanes[d.participantId].height)
            .attr('fill', d => speechLanes[d.participantId].color)
            .attr('rx', 3);

        // --- GAZE CONVERGENCE AREA ---
        const yGaze = d3.scaleLinear().domain([0, 1]).range([chartHeight, 50]);
        const area = d3.area<{ time: number, score: number }>()
            .x(d => x(d.time))
            .y0(chartHeight)
            .y1(d => yGaze(d.score))
            .curve(d3.curveBasis);
        
        g.append('path')
            .datum(gazeConvergence)
            .attr('fill', 'rgb(74 222 128)')
            .attr('fill-opacity', 0.2)
            .attr('d', area);
        
        g.append('path')
            .datum(gazeConvergence)
            .attr('fill', 'none')
            .attr('stroke', 'rgb(74 222 128)')
            .attr('stroke-width', 1.5)
            .attr('d', area.lineY1());

        // --- CLICK EVENTS ---
        g.append('g').selectAll('path.click')
            .data(data.clicks)
            .join('path')
            .attr('class', 'click')
            .attr('d', d3.symbol(d3.symbolTriangle, 48))
            .attr('transform', d => `translate(${x(d.time)}, ${speechLanes[d.participantId].y + 10})`)
            .attr('fill', d => speechLanes[d.participantId].color);

        // --- BOOKMARKS ---
        g.append('g').selectAll('text.bookmark')
            .data(bookmarks)
            .join('text')
            .attr('class', 'bookmark')
            .attr('x', d => x(d.time))
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('cursor', 'pointer')
            .text(d => BOOKMARK_ICONS[d.type])
            .on('click', (_, d) => onBookmarkClick(d));
            
        // --- SCRUBBER ---
        const scrubber = g.append('line')
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        const updateScrubber = (time: number) => {
            scrubber.attr('x1', x(time)).attr('x2', x(time));
        };
        updateScrubber(currentTime);

        // --- INTERACTION ---
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'none')
            .style('pointer-events', 'all')
            .on('click', (event) => {
                const [mx] = d3.pointer(event);
                const newTime = x.invert(mx - margin.left);
                onTimeChange(Math.max(0, Math.min(data.duration, newTime)));
            });

    }, [data, bookmarks, currentTime, onTimeChange, onBookmarkClick, gazeConvergence]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default MultimodalTimeline;
