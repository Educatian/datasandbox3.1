
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { PCA3DPoint, PCAResult } from '../types';

interface PCAVisualizerProps {
    data3D: PCA3DPoint[];
    pcaResult: PCAResult | null;
}

// 3D rotation and projection logic
const project = (point: number[], angleX: number, angleY: number) => {
    const { x, y, z } = { x: point[0], y: point[1], z: point[2] };
    const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x2 = x * cosY - z1 * sinY;
    return [x2, y1];
};

const PCAVisualizer: React.FC<PCAVisualizerProps> = ({ data3D, pcaResult }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [angles, setAngles] = useState({ x: -0.5, y: -0.5 });

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 500, height = 500;
        const scale = 3;

        svg.attr('viewBox', `${-width/2} ${-height/2} ${width} ${height}`);
        
        // Initialize structure
        if (svg.select('.pca-plane').empty()) {
             svg.append('g').attr('class', 'pca-plane');
             svg.append('g').attr('class', 'axes');
             svg.append('g').attr('class', 'points');

             // Drag behavior for rotation
            const drag = d3.drag<SVGSVGElement, unknown>()
            .on('drag', (event) => {
                setAngles(prev => ({
                    y: prev.y + event.dx * 0.01,
                    x: prev.x - event.dy * 0.01,
                }));
            });
            svg.call(drag as any);
        }

        // Draw PCA plane
        if (pcaResult) {
            const pc1 = pcaResult.principalComponents[0].map(v => v * 60);
            const pc2 = pcaResult.principalComponents[1].map(v => v * 60);
            const planeCorners = [
                [-pc1[0] - pc2[0], -pc1[1] - pc2[1], -pc1[2] - pc2[2]],
                [ pc1[0] - pc2[0],  pc1[1] - pc2[1],  pc1[2] - pc2[2]],
                [ pc1[0] + pc2[0],  pc1[1] + pc2[1],  pc1[2] + pc2[2]],
                [-pc1[0] + pc2[0], -pc1[1] + pc2[1], -pc1[2] + pc2[2]],
            ];
            
            const projectedCorners = planeCorners.map(p => project(p, angles.x, angles.y));
            
            svg.select('.pca-plane').selectAll('polygon')
                .data([projectedCorners])
                .join('polygon')
                .attr('points', d => d.map(p => p.join(',')).join(' '))
                .attr('fill', 'rgb(139 92 246)')
                .attr('opacity', 0.2);
        } else {
            svg.select('.pca-plane').selectAll('polygon').remove();
        }
        
        // Project and sort points for 3D effect
        const projectedPoints = data3D.map(p => {
            const [x, y, z] = [p.x, p.y, p.z];
            const [projX, projY] = project([x, y, z], angles.x, angles.y);
            const zRotated = y * Math.sin(angles.x) + z * Math.cos(angles.x);
            const depth = x * Math.sin(angles.y) + zRotated * Math.cos(angles.y);
            return { id: p.id, x: projX * scale, y: projY * scale, depth };
        }).sort((a, b) => a.depth - b.depth);

        // Draw points
        svg.select('.points').selectAll('circle')
            .data(projectedPoints, (d: any) => d.id)
            .join('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => 2.5 * (1 + d.depth / 100))
            .attr('fill', 'rgb(34 211 238)')
            .attr('opacity', d => 0.5 + 0.5 * (1 + d.depth / 100));

        // Draw axes lines (simple representation)
        const axisLength = 60;
        const axesData = [
            { id: 'x', p1: [-axisLength, 0, 0], p2: [axisLength, 0, 0], color: 'red' },
            { id: 'y', p1: [0, -axisLength, 0], p2: [0, axisLength, 0], color: 'green' },
            { id: 'z', p1: [0, 0, -axisLength], p2: [0, 0, axisLength], color: 'blue' },
        ];

        svg.select('.axes').selectAll('line.axis')
            .data(axesData, (d: any) => d.id)
            .join('line')
            .attr('class', 'axis')
            .attr('x1', d => project(d.p1, angles.x, angles.y)[0] * scale)
            .attr('y1', d => project(d.p1, angles.x, angles.y)[1] * scale)
            .attr('x2', d => project(d.p2, angles.x, angles.y)[0] * scale)
            .attr('y2', d => project(d.p2, angles.x, angles.y)[1] * scale)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 1);


    }, [data3D, pcaResult, angles]);
    
    // 2D Projection plot
    const svg2DRef = useRef<SVGSVGElement | null>(null);
    useEffect(() => {
        if (!svg2DRef.current || !pcaResult) return;
        const svg = d3.select(svg2DRef.current);
        const width = 250, height = 250;
        const margin = { top: 20, right: 20, bottom: 30, left: 30 };
        
        if (svg.select('.bg').empty()) {
            svg.attr('viewBox', `0 0 ${width} ${height}`);
            svg.append('rect').attr('class', 'bg').attr('width', width).attr('height', height).attr('fill', 'rgb(51 65 85)');
            svg.append('g').attr('class', 'x-axis');
            svg.append('g').attr('class', 'y-axis');
            svg.append('g').attr('class', 'points');
        }
        
        const data = pcaResult.projectedData;
        const x = d3.scaleLinear().domain(d3.extent(data, d => d.x) as [number, number]).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain(d3.extent(data, d => d.y) as [number, number]).range([height - margin.bottom, margin.top]);

        svg.select<SVGGElement>('.x-axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(3)).attr('color', 'rgb(156 163 175)');
        svg.select<SVGGElement>('.y-axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(3)).attr('color', 'rgb(156 163 175)');

        svg.select('.points').selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 2)
            .attr('fill', 'rgb(34 211 238)');
    }, [pcaResult]);

    return (
        <div className="w-full h-full flex flex-col items-center">
            <div className="w-full flex-grow relative cursor-move">
                 <svg ref={svgRef} className="w-full h-full"></svg>
            </div>
            <div className="mt-4 p-2 bg-slate-900 rounded-lg">
                <h4 className="text-center text-sm text-slate-300 mb-1">2D Projection</h4>
                <svg ref={svg2DRef} width="250" height="250"></svg>
            </div>
        </div>
    );
};

export default PCAVisualizer;
