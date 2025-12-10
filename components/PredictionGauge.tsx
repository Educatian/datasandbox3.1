import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface PredictionGaugeProps {
    prediction: number;
    baseValue: number;
}

const PredictionGauge: React.FC<PredictionGaugeProps> = ({ prediction, baseValue }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const width = 250, height = 150;
    const arcWidth = 15;

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height - 20})`);
        
        const angleScale = d3.scaleLinear().domain([0, 100]).range([-Math.PI / 2, Math.PI / 2]);
        
        // Background arc
        const backgroundArc = d3.arc()
            .innerRadius(height - arcWidth - 30)
            .outerRadius(height - 30)
            .startAngle(angleScale(0))
            .endAngle(angleScale(100));
        
        g.append('path')
            .attr('d', backgroundArc)
            .attr('fill', 'rgb(51 65 85)');

        // Prediction arc
        const predictionArc = d3.arc()
            .innerRadius(height - arcWidth - 30)
            .outerRadius(height - 30)
            .startAngle(angleScale(0));

        const colorScale = d3.scaleLinear<string>()
            .domain([0, 50, 100])
            .range(['rgb(239 68 68)', 'rgb(250 204 21)', 'rgb(34 197 94)']);

        const arcTween = (newVal: number) => (d: any) => {
            const interpolate = d3.interpolate(d.endAngle, angleScale(newVal));
            return (t: number) => {
                d.endAngle = interpolate(t);
                return predictionArc(d);
            };
        };

        g.append('path')
            .datum({ endAngle: angleScale(0) })
            .attr('fill', colorScale(prediction))
            .transition().duration(1000)
            .attrTween('d', arcTween(prediction));
            
        // Text
        const text = g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-1em')
            .style('fill', 'white')
            .style('font-size', '2.5rem')
            .style('font-weight', 'bold');

        text.transition().duration(1000)
            .tween('text', function() {
                const that = d3.select(this);
                const i = d3.interpolateNumber(parseFloat(that.text()) || 0, prediction);
                return (t) => {
                    that.text(i(t).toFixed(0));
                };
            });

    }, [prediction, baseValue]);

    return <svg ref={svgRef}></svg>;
};

export default PredictionGauge;