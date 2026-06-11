import { describe, it, expect } from 'vitest';
import {
    normalCDF, chiSquarePValue, fPValue, tCDF, tQuantile, pdfBeta,
    calculateConfidenceInterval, calculateChiSquareTest,
    calculateLogisticRegression, predictLogisticProbability,
    calculateCorrelation, calculateLinearRegression, calculateRSquared,
    lowerRegularizedGamma, regularizedIncompleteBeta
} from './statisticsService';

// Golden values generated with scipy 1.17.1 / statsmodels.
// e.g. stats.norm.cdf(1.96), stats.chi2.sf(3.841, 1), stats.f.sf(4, 2, 20), ...

describe('special functions', () => {
    it('normalCDF matches scipy', () => {
        expect(normalCDF(1.96)).toBeCloseTo(0.9750021048517795, 9);
        expect(normalCDF(-0.5)).toBeCloseTo(0.3085375387259869, 9);
        expect(normalCDF(0)).toBeCloseTo(0.5, 12);
    });

    it('lowerRegularizedGamma sane bounds', () => {
        expect(lowerRegularizedGamma(2, 0)).toBe(0);
        expect(lowerRegularizedGamma(2, 1e6)).toBeCloseTo(1, 12);
    });

    it('regularizedIncompleteBeta symmetry I_x(a,b) = 1 - I_{1-x}(b,a)', () => {
        const x = 0.37, a = 2.5, b = 4.2;
        expect(regularizedIncompleteBeta(x, a, b))
            .toBeCloseTo(1 - regularizedIncompleteBeta(1 - x, b, a), 10);
    });

    it('chi-square p-values match scipy', () => {
        expect(chiSquarePValue(3.841, 1)).toBeCloseTo(0.050013683763956804, 9);
        expect(chiSquarePValue(10.0, 4)).toBeCloseTo(0.04042768199451279, 9);
        expect(chiSquarePValue(0.5, 2)).toBeCloseTo(0.7788007830714049, 9);
    });

    it('F p-values match scipy', () => {
        expect(fPValue(4.0, 2, 20)).toBeCloseTo(0.03457161303360778, 9);
        expect(fPValue(1.0, 3, 50)).toBeCloseTo(0.40062322530428573, 9);
        expect(fPValue(15.0, 1, 10)).toBeCloseTo(0.003094086686210894, 9);
    });

    it('t CDF matches scipy', () => {
        expect(tCDF(2.0, 10)).toBeCloseTo(0.9633059826146299, 9);
        expect(tCDF(-1.5, 5)).toBeCloseTo(0.09695184012123666, 9);
    });

    it('t quantile matches scipy', () => {
        expect(tQuantile(0.975, 10)).toBeCloseTo(2.2281388519862744, 7);
        expect(tQuantile(0.975, 4)).toBeCloseTo(2.7764451051977934, 7);
        expect(tQuantile(0.995, 29)).toBeCloseTo(2.756385903670605, 7);
    });

    it('beta PDF is normalized (matches scipy)', () => {
        expect(pdfBeta(0.5, 2, 2)).toBeCloseTo(1.5, 9);
        expect(pdfBeta(0.3, 5, 2)).toBeCloseTo(0.17009999999999992, 9);
    });
});

describe('confidence interval (t-based)', () => {
    it('uses the t critical value for small n', () => {
        // n = 5, sd known from data; CI must use t(0.975, 4) = 2.7764, not z = 1.96
        const data = [10, 12, 14, 16, 18]; // mean 14, sd 3.1623, se 1.41421
        const { sampleMean, lowerBound, upperBound } = calculateConfidenceInterval(data, 95);
        expect(sampleMean).toBeCloseTo(14, 10);
        const halfWidth = (upperBound - lowerBound) / 2;
        expect(halfWidth).toBeCloseTo(2.7764451051977934 * 1.4142135623730951, 5);
    });
});

describe('chi-square test', () => {
    it('computes exact p for a 2x2 table', () => {
        // table [[10, 20], [20, 10]]: chi2 = 6.6667 (no Yates), df = 1
        const result = calculateChiSquareTest([[10, 20], [20, 10]]);
        expect(result.chi2).toBeCloseTo(6.666666666, 6);
        expect(result.degreesOfFreedom).toBe(1);
        // scipy: stats.chi2.sf(6.6667, 1) = 0.009823
        expect(result.pValue).toBeCloseTo(0.009823, 5);
    });
});

describe('logistic regression (IRLS MLE)', () => {
    it('matches statsmodels Logit coefficients', () => {
        const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
        const ys = [0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1];
        const data = xs.map((x, i) => ({ id: i, x, outcome: ys[i] as 0 | 1 }));
        const { beta0, beta1 } = calculateLogisticRegression(data as any);
        expect(beta0).toBeCloseTo(-1.6807578236946161, 5);
        expect(beta1).toBeCloseTo(0.21193264476543294, 5);
    });

    it('stays bounded under complete separation', () => {
        const data = [0, 1, 2, 3, 10, 11, 12, 13].map((x, i) => ({ id: i, x, outcome: (x > 5 ? 1 : 0) as 0 | 1 }));
        const { beta0, beta1 } = calculateLogisticRegression(data as any);
        expect(Number.isFinite(beta0)).toBe(true);
        expect(Number.isFinite(beta1)).toBe(true);
        expect(predictLogisticProbability(1, { beta0, beta1 })).toBeLessThan(0.1);
        expect(predictLogisticProbability(12, { beta0, beta1 })).toBeGreaterThan(0.9);
    });
});

describe('correlation & regression (regression guard)', () => {
    it('computes Pearson r exactly', () => {
        const data = [
            { id: 0, x: 1, y: 2 }, { id: 1, x: 2, y: 4 },
            { id: 2, x: 3, y: 5 }, { id: 3, x: 4, y: 9 }
        ];
        // scipy.stats.pearsonr -> r = 0.9647638212377322
        expect(calculateCorrelation(data)).toBeCloseTo(0.96476382, 6);
    });

    it('OLS slope/intercept and R^2', () => {
        const data = [
            { id: 0, x: 1, y: 2 }, { id: 1, x: 2, y: 4 },
            { id: 2, x: 3, y: 5 }, { id: 3, x: 4, y: 9 }
        ];
        const line = calculateLinearRegression(data);
        expect(line.slope).toBeCloseTo(2.2, 10);
        expect(line.intercept).toBeCloseTo(-0.5, 10);
        expect(calculateRSquared(data, line)).toBeCloseTo(0.9647638212377322 ** 2, 8);
    });
});
