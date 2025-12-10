import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface Distribution {
    mean: number;
    stdDev: number;
    color: string;
}

interface DistributionChartProps {
    distributions: Distribution[];
}

const DistributionChart: React.FC<DistributionChartProps> = ({ distributions }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    const pdf = (x: number, mean: number, stdDev: number) => {
        if (stdDev <= 0) return 0;
        const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    };

    useEffect(() => {
        if (!svgRef.current || distributions.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        
        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([margin.left, width - margin.right]);

        const yMax = d3.max(distributions, d => pdf(d.mean, d.mean, d.stdDev)) || 0.1;
        
        const y = d3.scaleLinear()
            .domain([0, yMax * 1.1])
            .range([height - margin.bottom, margin.top]);

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgb(30 41 59)');

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .attr('color', 'rgb(100 116 139)');

        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ''))
            .selectAll('line').attr('stroke', 'rgba(100, 116, 139, 0.2)');

        const line = d3.line<[number, number]>()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        distributions.forEach(dist => {
            const curveData: [number, number][] = [];
            for (let i = 0; i <= 100; i += 0.5) {
                curveData.push([i, pdf(i, dist.mean, dist.stdDev)]);
            }

            svg.append('path')
                .datum(curveData)
                .attr('fill', 'none')
                .attr('stroke', dist.color)
                .attr('stroke-width', 2.5)
                .attr('d', line);
        });

    }, [distributions]);

    return <svg ref={svgRef}></svg>;
};

export default DistributionChart;
