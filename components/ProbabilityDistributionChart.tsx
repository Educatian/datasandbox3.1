import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { pdfBeta } from '../services/statisticsService';

interface BetaDistribution {
    alpha: number;
    beta: number;
    color: string;
}

interface ProbabilityDistributionChartProps {
    distributions: BetaDistribution[];
}

const ProbabilityDistributionChart: React.FC<ProbabilityDistributionChartProps> = ({ distributions }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    useEffect(() => {
        if (!svgRef.current || distributions.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([margin.left, width - margin.right]);

        // Calculate yMax by sampling the PDF functions
        let yMax = 0.1;
        const samplePoints = d3.range(0.01, 1, 0.01); // Avoid 0 and 1 where PDF can be infinite
        distributions.forEach(dist => {
            const maxVal = d3.max(samplePoints, p => pdfBeta(p, dist.alpha, dist.beta));
            if (maxVal && maxVal > yMax) {
                yMax = maxVal;
            }
        });
        
        // Cap yMax to prevent extreme scales when alpha or beta are small
        const yMaxCapped = Math.min(yMax, 15);

        const y = d3.scaleLinear()
            .domain([0, yMaxCapped * 1.1])
            .range([height - margin.bottom, margin.top]);

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'rgb(30 41 59)');

        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5))
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
            // Generate points for the curve, avoiding strict 0 and 1
            for (let i = 0.001; i < 1; i += 0.005) {
                const pdfValue = pdfBeta(i, dist.alpha, dist.beta);
                // Ensure we don't plot infinite values
                if (isFinite(pdfValue)) {
                    curveData.push([i, pdfValue]);
                }
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

export default ProbabilityDistributionChart;