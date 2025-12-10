import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { LPAPoint, Profile } from '../types';

interface LPAScatterPlotProps {
    points: LPAPoint[];
    profiles: Profile[];
}

const COLORS = ["rgb(236 72 153)", "rgb(163 230 53)", "rgb(251 146 60)", "rgb(168 85 247)", "rgb(250 204 21)", "rgb(20 184 166)"];

const getEllipseParams = (profile: Profile) => {
    const { mean, covariance } = profile;
    const [a, b] = covariance[0];
    const c = covariance[1][1];
    
    const trace = a + c;
    const det = a * c - b * b;
    
    // Ensure the argument to sqrt is non-negative
    const discriminant = trace * trace / 4 - det;
    if (discriminant < 0) return null;

    const lambda1 = trace / 2 + Math.sqrt(discriminant);
    const lambda2 = trace / 2 - Math.sqrt(discriminant);

    // Scaling factor for ellipse, corresponds to ~2 std devs
    const scale = 2; 

    const rx = scale * Math.sqrt(lambda1);
    const ry = scale * Math.sqrt(lambda2);

    let angle = 0;
    if (b !== 0) {
        angle = Math.atan2(lambda1 - a, b) * (180 / Math.PI);
    }
    
    return {
        cx: mean[0],
        cy: mean[1],
        rx: rx,
        ry: ry,
        angle: angle,
    };
};


const LPAScatterPlot: React.FC<LPAScatterPlotProps> = ({ points, profiles }) => {
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

        svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'rgb(30 41 59)');

        svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x)).attr('color', 'rgb(100 116 139)');
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y)).attr('color', 'rgb(100 116 139)');
        
        const chartArea = svg.append('g');

        // Ellipses
        chartArea.selectAll('ellipse')
            .data(profiles)
            .join('ellipse')
            .attr('fill', d => COLORS[d.id])
            .attr('fill-opacity', 0.2)
            .attr('stroke', d => COLORS[d.id])
            .attr('stroke-width', 1.5)
            .transition().duration(500)
            .attr('transform', d => {
                const params = getEllipseParams(d);
                if (!params) return '';
                return `translate(${x(params.cx)}, ${y(params.cy)}) rotate(${params.angle})`;
            })
            .attr('rx', d => {
                const params = getEllipseParams(d);
                return params ? params.rx * (width - margin.left - margin.right) / 100 : 0;
            })
            .attr('ry', d => {
                const params = getEllipseParams(d);
                return params ? params.ry * (height - margin.top - margin.bottom) / 100 : 0;
            });


        // Points
        chartArea.selectAll('circle.point')
            .data(points, (d: any) => d.id)
            .join('circle')
            .attr('class', 'point')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4)
            .transition().duration(500)
            .attr('fill', d => d.profileId !== null ? d3.color(COLORS[d.profileId])?.copy({opacity: 0.9}) + '' : 'rgb(100 116 139)');
        
    }, [points, profiles]);

    return <svg ref={svgRef}></svg>;
};

export default LPAScatterPlot;
