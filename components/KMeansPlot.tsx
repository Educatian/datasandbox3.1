
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { KMeansPoint, Centroid } from '../types';

interface KMeansPlotProps {
    points: KMeansPoint[];
    centroids: Centroid[];
    k: number;
    onCentroidsChange: (centroids: Centroid[]) => void;
    isSettingInitial: boolean;
}

const COLORS = ["rgb(236 72 153)", "rgb(163 230 53)", "rgb(251 146 60)", "rgb(168 85 247)", "rgb(250 204 21)", "rgb(20 184 166)"];

const KMeansPlot: React.FC<KMeansPlotProps> = ({ points, centroids, k, onCentroidsChange, isSettingInitial }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500, height = 500;
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };

        svg.attr('width', width).attr('height', height);

        const x = d3.scaleLinear().domain([0, 100]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

        svg.selectAll('*').remove();

        const background = svg.append('rect')
            .attr('width', width).attr('height', height)
            .attr('fill', 'rgb(30 41 59)')
            .style('cursor', isSettingInitial ? 'crosshair' : 'default');

        if (isSettingInitial) {
            background.on('click', (event) => {
                if (centroids.length >= k) return;
                const [px, py] = d3.pointer(event);
                const newX = x.invert(px);
                const newY = y.invert(py);
                if (newX >= 0 && newX <= 100 && newY >= 0 && newY <= 100) {
                    onCentroidsChange([...centroids, { id: centroids.length, x: newX, y: newY }]);
                }
            });
        } else {
            background.on('click', null);
        }

        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        
        const chartArea = svg.append('g');

        // Points
        chartArea.selectAll('circle.point')
            .data(points, (d: any) => d.id)
            .join('circle')
            .attr('class', 'point')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4)
            .transition().duration(500)
            .attr('fill', d => d.clusterId !== null ? d3.color(COLORS[d.clusterId])?.copy({opacity: 0.7}) + '' : 'rgb(100 116 139)');

        // Centroids
        chartArea.selectAll('path.centroid')
            .data(centroids, (d: any) => d.id)
            .join(
                enter => enter.append('path')
                    .attr('class', 'centroid')
                    .attr('d', d3.symbol(d3.symbolCross, 200))
                    .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`)
                    .attr('fill', (_, i) => COLORS[i])
                    .attr('stroke', 'white')
                    .attr('stroke-width', 1.5),
                update => update.transition().duration(500)
                    .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`)
            );
        
    }, [points, centroids, k, isSettingInitial, onCentroidsChange]);

    return <svg ref={svgRef}></svg>;
};

export default KMeansPlot;
