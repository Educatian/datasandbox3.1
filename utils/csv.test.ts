import { describe, expect, it } from 'vitest';
import { extractBivariate, parseCsv } from './csv';

describe('CSV numeric pairs', () => {
    it('drops missing cells without manufacturing zero observations', () => {
        const csv = parseCsv('x,y\n1,2\n,3\n4,\n0,0\n" ",5');
        expect(extractBivariate(csv).points).toEqual([{ x: 1, y: 2 }, { x: 0, y: 0 }]);
    });

    it('does not use a single numeric column as both axes', () => {
        expect(extractBivariate(parseCsv('x\n1\n2')).points).toEqual([]);
    });

    it('ignores nonfinite values when choosing numeric columns', () => {
        const csv = parseCsv('label,x,y\nInfinity,1,2\nInfinity,3,4\nInfinity,5,6');
        expect(extractBivariate(csv)).toEqual({
            points: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }],
            xLabel: 'x', yLabel: 'y',
        });
    });

    it('preserves explicit axes, negative values and the point limit', () => {
        expect(extractBivariate(parseCsv('a;b;c\n1;-2;3\n4;5;6'), 2, 1, 1)).toEqual({
            points: [{ x: 3, y: -2 }], xLabel: 'c', yLabel: 'b',
        });
    });

    it('returns no points for empty input or a zero limit', () => {
        expect(extractBivariate(parseCsv('')).points).toEqual([]);
        expect(extractBivariate(parseCsv('x,y\n1,2'), undefined, undefined, 0).points).toEqual([]);
    });
});
