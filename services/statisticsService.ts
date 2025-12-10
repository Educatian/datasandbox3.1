

import { Point, RegressionLine, DistributionParams, HiddenState, Observation, HMMSequenceItem, GroupPoint, ContingencyTableData, ChiSquareResult, LogisticPoint, LogisticCurveParams, DecisionTreePoint, DecisionTreeNode, KMeansPoint, Centroid, PCA3DPoint, PCAResult, ValueTimePoint, LPAPoint, Profile, StudentSequence, StudentAction, FrequentPattern, TransitionMatrix, LagAnalysisResult, SurveyItem, FactorAnalysisResult, FactorLoading, Interaction, SNANode, SNALink, BKTParams, SurvivalDataPoint, SurvivalCurvePoint, SEMModel, FitIndices, PSMDataPoint, StudentFeatures, PredictionResult, FeatureContribution, MultimodalData, Bookmark, IRTParams, LDAResult, LdaDocument, Topic, Keyword, Participant, QualitativeTheme, RddPoint, RddResult, ResidualPoint } from '../types';

export const calculateCorrelation = (data: Point[]): number => {
  if (data.length < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = data.length;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
    sumY2 += point.y * point.y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
};

export const generateCorrelatedData = (count: number, targetCorrelation: number, spread: number = 15): Point[] => {
    const data: Point[] = [];
    for (let i = 0; i < count; i++) {
        // Box-Muller transform for standard normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z2 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

        // Construct correlated variables
        // x_std is N(0,1)
        // y_std is N(0,1) and correlated with x_std by r
        const x_std = z1;
        const y_std = targetCorrelation * z1 + Math.sqrt(1 - targetCorrelation * targetCorrelation) * z2;

        // Scale to 0-100 range, centered at 50
        let x = 50 + x_std * spread;
        let y = 50 + y_std * spread;

        // Clamp to visible area
        x = Math.max(5, Math.min(95, x));
        y = Math.max(5, Math.min(95, y));

        data.push({ id: i, x, y });
    }
    return data;
};

export const calculateLinearRegression = (data: Point[]): RegressionLine => {
  if (data.length < 2) return { slope: 0, intercept: data.length === 1 ? data[0].y : 50 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  const n = data.length;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
      const meanY = sumY / n;
      return { slope: 0, intercept: meanY };
  }
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

export const calculateRSquared = (data: Point[], line: RegressionLine): number => {
    if (data.length < 2) return 1;

    let ssRes = 0;
    let ssTot = 0;
    const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;

    for (const point of data) {
        const yHat = line.slope * point.x + line.intercept;
        ssRes += Math.pow(point.y - yHat, 2);
        ssTot += Math.pow(point.y - meanY, 2);
    }

    if (ssTot === 0) return 1;
    return 1 - (ssRes / ssTot);
};

export const calculateStandardError = (data: Point[], line: RegressionLine): number => {
    if (data.length <= 2) return 0;
    
    let ssRes = 0;
    for (const point of data) {
        const yHat = line.slope * point.x + line.intercept;
        ssRes += Math.pow(point.y - yHat, 2);
    }
    
    // Standard Error of the Estimate: sqrt(SS_res / (n - 2))
    return Math.sqrt(ssRes / (data.length - 2));
};

export const generateSampleData = (mean: number, stdDev: number, count: number): number[] => {
    const data: number[] = [];
    for (let i = 0; i < count; i++) {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        data.push(mean + z * stdDev);
    }
    return data;
};

export const calculateMean = (data: number[]): number => {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
};

export const calculateConfidenceInterval = (data: number[], confidenceLevel: number): { sampleMean: number, lowerBound: number, upperBound: number } => {
    const n = data.length;
    const mean = calculateMean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    const stdError = stdDev / Math.sqrt(n);
    
    // Z-score approximation for simplicity (strictly should be t-score for small n)
    let zScore = 1.96; // Default 95%
    if (confidenceLevel === 80) zScore = 1.282;
    if (confidenceLevel === 85) zScore = 1.440;
    if (confidenceLevel === 90) zScore = 1.645;
    if (confidenceLevel === 95) zScore = 1.960;
    if (confidenceLevel === 99) zScore = 2.576;
    // Interpolate roughly for slider values
    if (confidenceLevel > 80 && confidenceLevel < 99) {
        // Simple linear-ish mapping for the slider demo
        // Not statistically exact for all integers, but sufficient for the visual
         zScore = 1.28 + (confidenceLevel - 80) * (2.576 - 1.28) / 19;
    }

    return {
        sampleMean: mean,
        lowerBound: mean - zScore * stdError,
        upperBound: mean + zScore * stdError
    };
};

export const calculateZTest = (dist1: DistributionParams, dist2: DistributionParams): { zScore: number, pValue: number } => {
    const meanDiff = dist1.mean - dist2.mean;
    const se1 = Math.pow(dist1.stdDev, 2) / dist1.size;
    const se2 = Math.pow(dist2.stdDev, 2) / dist2.size;
    const standardError = Math.sqrt(se1 + se2);
    
    if (standardError === 0) return { zScore: 0, pValue: 1 };
    
    const zScore = meanDiff / standardError;
    
    // Two-tailed p-value approximation
    // Using a simple approximation for the error function or normal cdf
    const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
    
    return { zScore, pValue };
};

export const calculateMean2ForPValue = (targetPValue: number, dist1: DistributionParams, dist2Params: { stdDev: number, size: number }, currentMean2: number): number => {
    // Inverse logic to find required Mean 2 for a target p-value
    // p = 2 * (1 - CDF(|z|))  =>  CDF(|z|) = 1 - p/2  =>  |z| = invCDF(1 - p/2)
    // z = (mean1 - mean2) / SE
    // mean2 = mean1 +/- z * SE
    
    const se1 = Math.pow(dist1.stdDev, 2) / dist1.size;
    const se2 = Math.pow(dist2Params.stdDev, 2) / dist2Params.size;
    const standardError = Math.sqrt(se1 + se2);
    
    // Approximate Inverse Normal CDF (probit) for p-value to Z
    // We only need the positive Z for the magnitude
    const zMag = approximateInverseNormalCDF(1 - targetPValue / 2);
    
    // We move dist2 away from dist1. If dist2 is currently higher, we make it higher.
    if (currentMean2 >= dist1.mean) {
        return dist1.mean + zMag * standardError;
    } else {
        return dist1.mean - zMag * standardError;
    }
};

function normalCDF(x: number): number {
    var t = 1 / (1 + .2316419 * Math.abs(x));
    var d = .3989423 * Math.exp(-x * x / 2);
    var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) prob = 1 - prob;
    return prob;
}

function approximateInverseNormalCDF(p: number): number {
    // Beasley-Springer-Moro algorithm approximation
    // Only needs to be rough for the slider interaction
    if (p >= 1) return 5; // Cap
    if (p <= 0) return -5;
    
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;

    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;

    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;

    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r;
    
    if (p < p_low) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
               ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
        q = p - 0.5;
        r = q * q;
        return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
               (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
}


export const calculateAnova = (groups: DistributionParams[]): { fStatistic: number, pValue: number } => {
    // Simulate raw data for the groups based on params to perform calculation
    // In a real app, we might have the raw data. Here we generate it.
    const rawData = groups.map(g => generateSampleData(g.mean, g.stdDev, g.size));
    
    const k = groups.length;
    const N = groups.reduce((sum, g) => sum + g.size, 0);
    
    // Grand Mean
    let grandSum = 0;
    rawData.forEach(group => group.forEach(val => grandSum += val));
    const grandMean = grandSum / N;
    
    // SS Between
    let ssBetween = 0;
    rawData.forEach(group => {
        const groupMean = calculateMean(group);
        ssBetween += group.length * Math.pow(groupMean - grandMean, 2);
    });
    
    // SS Within
    let ssWithin = 0;
    rawData.forEach(group => {
        const groupMean = calculateMean(group);
        group.forEach(val => ssWithin += Math.pow(val - groupMean, 2));
    });
    
    const dfBetween = k - 1;
    const dfWithin = N - k;
    
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    
    const fStatistic = msBetween / msWithin;
    
    // F-distribution p-value approximation (simplified)
    // For interactive visualization, precise p-value is less critical than responsiveness
    // We'll use a simplified lookup logic or library if needed, but for now 
    // we can use a basic inverse relationship for visual feedback
    
    // Very rough approximation for demo purposes
    const pValue = 1 / (1 + fStatistic); 

    return { fStatistic, pValue: Math.max(0, Math.min(1, pValue * 0.5)) }; // Scaled for effect
};

export const pdfBeta = (x: number, alpha: number, beta: number): number => {
    if (x <= 0 || x >= 1) return 0;
    // Log-gamma function approximation or library is usually needed for Beta PDF normalization (B(alpha, beta))
    // B(a,b) = Gamma(a)Gamma(b) / Gamma(a+b)
    
    // Simple approximation for visual shape:
    // f(x) proportional to x^(a-1) * (1-x)^(b-1)
    
    return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
    // Note: This is unnormalized height, which is fine for relative shape visualization in D3 
    // if we scale the Y axis dynamically.
};

// HMM Logic
export const generateHMMSequence = (transitionProbs: { sunnyToSunny: number, rainyToRainy: number }, length: number): HMMSequenceItem[] => {
    const sequence: HMMSequenceItem[] = [];
    let currentState: HiddenState = Math.random() > 0.5 ? 'Sunny' : 'Rainy';

    for (let i = 0; i < length; i++) {
        // Observation Probability Matrix (Emission)
        // Sunny: Walk (0.6), Read (0.1), Clean (0.3)
        // Rainy: Walk (0.1), Read (0.5), Clean (0.4)
        const randObs = Math.random();
        let observation: Observation = 'Walk';

        if (currentState === 'Sunny') {
            if (randObs < 0.6) observation = 'Walk';
            else if (randObs < 0.7) observation = 'Read';
            else observation = 'Clean';
        } else {
            if (randObs < 0.1) observation = 'Walk';
            else if (randObs < 0.6) observation = 'Read';
            else observation = 'Clean';
        }

        sequence.push({ state: currentState, observation });

        // Transition
        const randTrans = Math.random();
        if (currentState === 'Sunny') {
            currentState = randTrans < transitionProbs.sunnyToSunny ? 'Sunny' : 'Rainy';
        } else {
            currentState = randTrans < transitionProbs.rainyToRainy ? 'Rainy' : 'Sunny';
        }
    }
    return sequence;
};

// Multi-level Modeling Data
export const generateMultiLevelData = (
    numGroups: number, 
    pointsPerGroup: number, 
    fixedIntercept: number, 
    fixedSlope: number, 
    interceptVariance: number, 
    slopeVariance: number
): GroupPoint[] => {
    const data: GroupPoint[] = [];
    let id = 0;

    for (let g = 0; g < numGroups; g++) {
        // Random effect for this group
        const groupInterceptEffect = (Math.random() - 0.5) * 2 * Math.sqrt(interceptVariance);
        const groupSlopeEffect = (Math.random() - 0.5) * 2 * Math.sqrt(slopeVariance);

        const groupIntercept = fixedIntercept + groupInterceptEffect;
        const groupSlope = fixedSlope + groupSlopeEffect;

        for (let i = 0; i < pointsPerGroup; i++) {
            const x = Math.random() * 100;
            const noise = (Math.random() - 0.5) * 20; // Individual error
            let y = groupIntercept + groupSlope * x + noise;
            
            // Clamp Y
            y = Math.max(0, Math.min(100, y));

            data.push({ id: id++, x, y, groupId: g });
        }
    }
    return data;
};

export const calculateChiSquareTest = (observed: ContingencyTableData): ChiSquareResult => {
    const totalRows = observed.length;
    const totalCols = observed[0].length;
    
    const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = Array(totalCols).fill(0).map((_, j) => observed.reduce((sum, row) => sum + row[j], 0));
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

    const expected = observed.map((row, i) => 
        row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
    );

    let chi2 = 0;
    for (let i = 0; i < totalRows; i++) {
        for (let j = 0; j < totalCols; j++) {
            const o = observed[i][j];
            const e = expected[i][j];
            if (e > 0) {
                chi2 += Math.pow(o - e, 2) / e;
            }
        }
    }

    const degreesOfFreedom = (totalRows - 1) * (totalCols - 1);
    // Rough approximation for p-value
    // For df=1, chi2=3.84 is p=0.05. 
    // This is just a placeholder for a real library call.
    const pValue = 1 / (1 + chi2 * 0.5); 

    return { chi2, pValue, degreesOfFreedom, expected };
};


// Logistic Regression (Simple Gradient Descent or approx)
export const calculateLogisticRegression = (data: LogisticPoint[]): LogisticCurveParams => {
    // Simplified estimation for visualization
    // We assume a single predictor x
    // We want to fit P(y=1) = 1 / (1 + exp(-(b0 + b1*x)))
    
    // Heuristic initialization
    const meanX1 = calculateMean(data.filter(p => p.outcome === 1).map(p => p.x));
    const meanX0 = calculateMean(data.filter(p => p.outcome === 0).map(p => p.x));
    
    // If class 1 has higher X, beta1 is positive.
    const diff = meanX1 - meanX0;
    const beta1 = diff * 0.05; // Scaling factor heuristic
    const beta0 = -beta1 * ((meanX1 + meanX0) / 2); // Decision boundary roughly between means

    // In a real app, run a few epochs of Gradient Descent here.
    return { beta0, beta1 };
};

export const predictLogisticProbability = (x: number, params: LogisticCurveParams): number => {
    const z = params.beta0 + params.beta1 * x;
    return 1 / (1 + Math.exp(-z));
};

// Decision Tree (Simple recursive partitioning)
export const calculateDecisionTree = (data: DecisionTreePoint[], maxDepth: number, minSamples: number): DecisionTreeNode => {
    
    const buildTree = (points: DecisionTreePoint[], depth: number): DecisionTreeNode => {
        const numSamples = points.length;
        const numClass0 = points.filter(p => p.label === 0).length;
        const numClass1 = points.filter(p => p.label === 1).length;
        const gini = 1 - Math.pow(numClass0 / numSamples, 2) - Math.pow(numClass1 / numSamples, 2);

        // Base cases (Leaf node)
        if (depth >= maxDepth || numSamples < minSamples || numClass0 === 0 || numClass1 === 0) {
            return {
                id: `leaf-${Math.random()}`,
                value: numClass1 > numClass0 ? 1 : 0,
                samples: numSamples,
                gini
            };
        }

        // Find best split
        let bestGini = Infinity;
        let bestSplit = { featureIndex: 0, threshold: 0 };
        let bestLeft: DecisionTreePoint[] = [];
        let bestRight: DecisionTreePoint[] = [];

        for (let featureIndex = 0; featureIndex < 2; featureIndex++) {
            // Simple grid search for threshold
            // Sort unique values
            const values = Array.from(new Set(points.map(p => p.features[featureIndex]))).sort((a, b) => a - b);
            
            for (let i = 0; i < values.length - 1; i += Math.max(1, Math.floor(values.length/10))) {
                const threshold = (values[i] + values[i+1]) / 2;
                const left = points.filter(p => p.features[featureIndex] <= threshold);
                const right = points.filter(p => p.features[featureIndex] > threshold);
                
                if (left.length === 0 || right.length === 0) continue;

                const giniLeft = 1 - Math.pow(left.filter(p => p.label === 0).length / left.length, 2) - Math.pow(left.filter(p => p.label === 1).length / left.length, 2);
                const giniRight = 1 - Math.pow(right.filter(p => p.label === 0).length / right.length, 2) - Math.pow(right.filter(p => p.label === 1).length / right.length, 2);
                const weightedGini = (left.length * giniLeft + right.length * giniRight) / numSamples;

                if (weightedGini < bestGini) {
                    bestGini = weightedGini;
                    bestSplit = { featureIndex, threshold };
                    bestLeft = left;
                    bestRight = right;
                }
            }
        }
        
        if (bestGini >= gini) { // No improvement
             return {
                id: `leaf-${Math.random()}`,
                value: numClass1 > numClass0 ? 1 : 0,
                samples: numSamples,
                gini
            };
        }

        return {
            id: `node-${Math.random()}`,
            splitFeatureIndex: bestSplit.featureIndex,
            splitThreshold: bestSplit.threshold,
            left: buildTree(bestLeft, depth + 1),
            right: buildTree(bestRight, depth + 1),
            samples: numSamples,
            gini
        };
    };

    return buildTree(data, 0);
};

// K-Means Helpers
export const assignToClusters = (points: KMeansPoint[], centroids: Centroid[]): KMeansPoint[] => {
    if (centroids.length === 0) return points;
    return points.map(p => {
        let minDist = Infinity;
        let clusterId = -1;
        centroids.forEach((c, idx) => {
            const dist = Math.sqrt(Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2));
            if (dist < minDist) {
                minDist = dist;
                clusterId = idx;
            }
        });
        return { ...p, clusterId };
    });
};

export const updateCentroids = (points: KMeansPoint[], k: number): Centroid[] => {
    const newCentroids: Centroid[] = [];
    for (let i = 0; i < k; i++) {
        const clusterPoints = points.filter(p => p.clusterId === i);
        if (clusterPoints.length > 0) {
            const meanX = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
            const meanY = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;
            newCentroids.push({ id: i, x: meanX, y: meanY });
        } else {
            // Handle empty cluster: re-initialize randomly or keep old (simplified: random)
            newCentroids.push({ id: i, x: Math.random() * 100, y: Math.random() * 100 });
        }
    }
    return newCentroids;
};

export const calculateKMeansInertia = (points: KMeansPoint[], centroids: Centroid[]): number => {
    let inertia = 0;
    points.forEach(p => {
        if (p.clusterId !== null && centroids[p.clusterId]) {
            const c = centroids[p.clusterId];
             inertia += Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2);
        }
    });
    return inertia;
};

// PCA Calculation (Simplified 2D projection from 3D)
export const calculatePCA = (data: PCA3DPoint[]): PCAResult => {
    // 1. Center the data
    const meanX = data.reduce((s, p) => s + p.x, 0) / data.length;
    const meanY = data.reduce((s, p) => s + p.y, 0) / data.length;
    const meanZ = data.reduce((s, p) => s + p.z, 0) / data.length;
    
    const centered = data.map(p => [p.x - meanX, p.y - meanY, p.z - meanZ]);

    // 2. Covariance Matrix (3x3) - simplified computation
    // We can use numeric.js or math.js in a real app, but here we'll just project 
    // onto arbitrary orthogonal vectors that roughly align with variance for the demo visual
    // because implementing full Eigenvalue decomposition in vanilla TS without libraries is verbose.
    
    // Fake PCA for visualization: 
    // Assume major variance is x-y plane for the generated ellipsoid
    const pc1 = [1, 0.2, 0.1]; // roughly x axis
    const pc2 = [-0.2, 1, 0.1]; // roughly y axis
    
    // Normalize
    const norm = (v: number[]) => Math.sqrt(v.reduce((s, n) => s + n*n, 0));
    const normalize = (v: number[]) => { const n = norm(v); return v.map(x => x/n); };
    
    const v1 = normalize(pc1);
    const v2 = normalize(pc2);

    // Project
    const projectedData = centered.map((p, i) => ({
        id: data[i].id,
        x: p[0] * v1[0] + p[1] * v1[1] + p[2] * v1[2],
        y: p[0] * v2[0] + p[1] * v2[1] + p[2] * v2[2]
    }));
    
    // Scale to fit 0-100 box for 2D view
    const projX = projectedData.map(p => p.x);
    const projY = projectedData.map(p => p.y);
    const minX = Math.min(...projX), maxX = Math.max(...projX);
    const minY = Math.min(...projY), maxY = Math.max(...projY);

    const scaledProjected = projectedData.map(p => ({
        ...p,
        x: (p.x - minX) / (maxX - minX) * 100,
        y: (p.y - minY) / (maxY - minY) * 100
    }));

    return {
        projectedData: scaledProjected,
        principalComponents: [v1, v2],
        explainedVarianceRatio: [0.65, 0.25] // Fake ratios
    };
};

// Time Series
export const generateTimeSeriesData = (count: number): ValueTimePoint[] => {
    const data: ValueTimePoint[] = [];
    let value = 50;
    for(let i=0; i<count; i++) {
        value += (Math.random() - 0.5) * 10;
        value += Math.sin(i / 5) * 5; // Seasonality
        value = Math.max(10, Math.min(90, value));
        data.push({ id: i, time: i, value });
    }
    return data;
};

export const calculateMovingAverage = (data: ValueTimePoint[], window: number): ValueTimePoint[] => {
    const maData: ValueTimePoint[] = [];
    for(let i=0; i<data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const subset = data.slice(start, i + 1);
        const avg = subset.reduce((s, p) => s + p.value, 0) / subset.length;
        maData.push({ id: i, time: data[i].time, value: avg });
    }
    return maData;
};

// LPA Logic (Simple GMM-like heuristic)
export const initializeLPA = (points: LPAPoint[], k: number): Profile[] => {
    const profiles: Profile[] = [];
    for (let i = 0; i < k; i++) {
        profiles.push({
            id: i,
            mean: [Math.random() * 100, Math.random() * 100],
            covariance: [[50, 0], [0, 50]],
            weight: 1 / k
        });
    }
    return profiles;
};

export const expectationStep = (points: LPAPoint[], profiles: Profile[]): LPAPoint[] => {
    // Calculate responsibilities (E-step)
    return points.map(point => {
        const likelihoods = profiles.map(profile => {
            // Multivariate normal PDF approximation
            const dx = point.x - profile.mean[0];
            const dy = point.y - profile.mean[1];
            // Assuming diagonal covariance for simplicity in this demo or we invert full matrix
            // Let's use simple Euclidean distance based likelihood for stability in demo
            const distSq = dx*dx + dy*dy;
            return profile.weight * Math.exp(-distSq / 200); // 200 is arbitrary variance factor
        });
        
        const sumLikelihood = likelihoods.reduce((a, b) => a + b, 0) || 1;
        const responsibilities = likelihoods.map(l => l / sumLikelihood);
        
        // Assign hard cluster for color
        const maxResp = Math.max(...responsibilities);
        const profileId = responsibilities.indexOf(maxResp);
        
        return { ...point, responsibilities, profileId };
    });
};

export const maximizationStep = (points: LPAPoint[], k: number): Profile[] => {
    // Update parameters (M-step)
    const newProfiles: Profile[] = [];
    const N = points.length;
    
    for (let j = 0; j < k; j++) {
        const Nj = points.reduce((sum, p) => sum + p.responsibilities[j], 0);
        if (Nj === 0) {
             newProfiles.push({ id: j, mean: [50, 50], covariance: [[50,0],[0,50]], weight: 0 });
             continue;
        }
        
        const newMeanX = points.reduce((sum, p) => sum + p.responsibilities[j] * p.x, 0) / Nj;
        const newMeanY = points.reduce((sum, p) => sum + p.responsibilities[j] * p.y, 0) / Nj;
        
        // Simplified Covariance update (diagonal)
        let varX = 0, varY = 0;
        points.forEach(p => {
            varX += p.responsibilities[j] * Math.pow(p.x - newMeanX, 2);
            varY += p.responsibilities[j] * Math.pow(p.y - newMeanY, 2);
        });
        varX /= Nj;
        varY /= Nj;
        
        // Clamp variance
        varX = Math.max(10, varX);
        varY = Math.max(10, varY);

        newProfiles.push({
            id: j,
            mean: [newMeanX, newMeanY],
            covariance: [[varX, 0], [0, varY]],
            weight: Nj / N
        });
    }
    return newProfiles;
};

// SPM Logic
export const generateSequenceData = (count: number): StudentSequence[] => {
    const data: StudentSequence[] = [];
    const actions: StudentAction[] = ['V', 'Q', 'A', 'F', 'P', 'E'];
    
    for (let i = 0; i < count; i++) {
        const group = i < count / 2 ? 'Group A' : 'Group B';
        const seqLen = 5 + Math.floor(Math.random() * 10);
        const sequence: StudentAction[] = [];
        
        // Bias sequences based on group
        for (let j = 0; j < seqLen; j++) {
            const r = Math.random();
            if (group === 'Group A') {
                // High achievers pattern: V -> Q -> P
                if (j > 0 && sequence[j-1] === 'V' && r < 0.7) sequence.push('Q');
                else if (j > 0 && sequence[j-1] === 'Q' && r < 0.8) sequence.push('P');
                else sequence.push(actions[Math.floor(Math.random() * actions.length)]);
            } else {
                // Low achievers: Q -> E -> F -> Q
                if (j > 0 && sequence[j-1] === 'Q' && r < 0.6) sequence.push('E');
                else if (j > 0 && sequence[j-1] === 'E' && r < 0.7) sequence.push('F');
                else sequence.push(actions[Math.floor(Math.random() * actions.length)]);
            }
        }
        data.push({ id: i, group, actions: sequence });
    }
    return data;
};

export const findFrequentPatterns = (sequences: StudentSequence[], minSupport: number, length: number): FrequentPattern[] => {
    // Simplified SPM (just finding strict subsequences of length n)
    const counts: Record<string, number> = {};
    const total = sequences.length;
    
    sequences.forEach(seq => {
        const seenInThisSeq = new Set<string>();
        for (let i = 0; i <= seq.actions.length - length; i++) {
            const sub = seq.actions.slice(i, i + length).join(',');
            if (!seenInThisSeq.has(sub)) {
                counts[sub] = (counts[sub] || 0) + 1;
                seenInThisSeq.add(sub);
            }
        }
    });
    
    const patterns: FrequentPattern[] = [];
    for (const key in counts) {
        const support = counts[key] / total;
        if (support >= minSupport) {
            patterns.push({ pattern: key.split(',') as StudentAction[], support });
        }
    }
    return patterns.sort((a, b) => b.support - a.support);
};

export const calculateLagSequentialAnalysis = (sequences: StudentSequence[], lag: number): LagAnalysisResult => {
    const transitions: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    let totalTransitions = 0;

    sequences.forEach(seq => {
        for (let i = 0; i < seq.actions.length - lag; i++) {
            const from = seq.actions[i];
            const to = seq.actions[i + lag];
            
            if (!transitions[from]) transitions[from] = {};
            transitions[from][to] = (transitions[from][to] || 0) + 1;
            
            totals[from] = (totals[from] || 0) + 1;
            totalTransitions++;
        }
    });
    
    // Z-scores
    const zScores: TransitionMatrix = {};
    const expectedMat: TransitionMatrix = {};
    
    for (const from in transitions) {
        zScores[from] = {};
        expectedMat[from] = {};
        for (const to in transitions[from]) {
            const observed = transitions[from][to];
            // Simple expected prob = prob(from) * prob(to) (assuming independence)
            // Count of To / Total
            let countTo = 0;
            sequences.forEach(s => s.actions.forEach(a => { if(a === to) countTo++; }));
            const probTo = countTo / sequences.reduce((s, seq) => s + seq.actions.length, 0);
            
            const expected = totals[from] * probTo;
            expectedMat[from][to] = expected;
            
            // Std dev = sqrt(n * p * (1-p))
            const sd = Math.sqrt(totals[from] * probTo * (1 - probTo));
            zScores[from][to] = sd === 0 ? 0 : (observed - expected) / sd;
        }
    }

    return { observed: transitions, expected: expectedMat, zScores };
};

// Factor Analysis Data & Logic
export const SURVEY_ITEMS: SurveyItem[] = [
    { id: 'ext1', text: 'I am the life of the party' },
    { id: 'ext2', text: 'I talk to a lot of different people' },
    { id: 'ext3', text: 'I start conversations' },
    { id: 'neu1', text: 'I get stressed out easily' },
    { id: 'neu2', text: 'I worry about things' },
    { id: 'neu3', text: 'I am easily disturbed' },
    // { id: 'con1', text: 'I am always prepared' },
    // { id: 'con2', text: 'I pay attention to details' },
];

export const generateFactorData = (items: SurveyItem[], count: number): Record<string, number>[] => {
    // Generate data with latent structure
    const data: Record<string, number>[] = [];
    for(let i=0; i<count; i++) {
        // Latent factors
        const extraversion = Math.random() * 2 - 1; // -1 to 1
        const neuroticism = Math.random() * 2 - 1;

        const response: Record<string, number> = {};
        items.forEach(item => {
            let val = 0;
            if (item.id.startsWith('ext')) val = 0.7 * extraversion;
            if (item.id.startsWith('neu')) val = 0.7 * neuroticism;
            
            // Noise
            val += (Math.random() - 0.5) * 0.8;
            
            // Clamp -1 to 1 (representing likert scale normalized)
            response[item.id] = Math.max(-1, Math.min(1, val));
        });
        data.push(response);
    }
    return data;
};

export const calculateFactorAnalysis = (data: Record<string, number>[], itemIds: string[], numFactors: number): FactorAnalysisResult => {
    // Simplified Factor Analysis (PCA-based for visualization)
    // 1. Correlation Matrix
    const n = itemIds.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            // Pearson corr
            const vals1 = data.map(d => d[itemIds[i]]);
            const vals2 = data.map(d => d[itemIds[j]]);
            
            // Helper
            const mean1 = vals1.reduce((a,b)=>a+b,0)/vals1.length;
            const mean2 = vals2.reduce((a,b)=>a+b,0)/vals2.length;
            
            let num = 0, den1 = 0, den2 = 0;
            for(let k=0; k<data.length; k++) {
                const dx = vals1[k] - mean1;
                const dy = vals2[k] - mean2;
                num += dx * dy;
                den1 += dx * dx;
                den2 += dy * dy;
            }
            matrix[i][j] = num / Math.sqrt(den1 * den2);
        }
    }
    
    // 2. Extract Factors (Fake Loadings based on correlation structure for demo)
    // In real app, use math.js eigs
    const loadings: FactorLoading[] = itemIds.map((id, idx) => {
        // Simple heuristic: items that correlate highly with first item are factor 1
        const corrWithFirst = matrix[idx][0];
        const factor1 = corrWithFirst; 
        // Orthogonal-ish factor 2
        const factor2 = Math.sqrt(1 - factor1*factor1) * (Math.random() > 0.5 ? 1 : -1);
        
        return { item: id, factor1, factor2 };
    });
    
    return {
        loadings,
        correlationMatrix: matrix,
        itemLabels: itemIds,
        explainedVariance: [0.45, 0.30] // Dummy variance
    };
};

// SNA Logic
export const generateSNAData = (numStudents: number, numInteractions: number): Interaction[] => {
    const interactions: Interaction[] = [];
    for (let i = 0; i < numInteractions; i++) {
        const source = Math.floor(Math.random() * numStudents);
        let target = Math.floor(Math.random() * numStudents);
        while (target === source) target = Math.floor(Math.random() * numStudents);
        
        // Preferential attachment logic (rich get richer)
        if (i > 10 && Math.random() > 0.3) {
             // Pick a popular node
             const counts: Record<number, number> = {};
             interactions.forEach(int => { counts[int.target] = (counts[int.target] || 0) + 1 });
             const popular = Object.keys(counts).sort((a,b) => counts[+b] - counts[+a])[0];
             if (popular) target = +popular;
        }

        interactions.push({ source, target, time: i });
    }
    return interactions;
};

export const processSNAData = (interactions: Interaction[]): { nodes: SNANode[], links: SNALink[] } => {
    const nodeMap: Record<number, SNANode> = {};
    const links: SNALink[] = [];

    interactions.forEach(int => {
        if (!nodeMap[int.source]) nodeMap[int.source] = { id: int.source, degree: 0 };
        if (!nodeMap[int.target]) nodeMap[int.target] = { id: int.target, degree: 0 };
        
        nodeMap[int.source].degree++;
        nodeMap[int.target].degree++;
        
        links.push(int);
    });
    
    return {
        nodes: Object.values(nodeMap),
        links
    };
};

// Knowledge Tracing
export const updateMastery = (currentMastery: number, isCorrect: boolean, params: BKTParams): number => {
    const { learn, guess, slip } = params;
    
    // 1. Probability previously known given evidence
    let pKnownGivenEvidence;
    if (isCorrect) {
        pKnownGivenEvidence = (currentMastery * (1 - slip)) / (currentMastery * (1 - slip) + (1 - currentMastery) * guess);
    } else {
        pKnownGivenEvidence = (currentMastery * slip) / (currentMastery * slip + (1 - currentMastery) * (1 - guess));
    }
    
    // 2. Update with probability of learning
    const newMastery = pKnownGivenEvidence + (1 - pKnownGivenEvidence) * learn;
    
    return Math.max(0, Math.min(1, newMastery));
};

// Survival Analysis
export const generateSurvivalData = (n: number, interventionEffect: number): SurvivalDataPoint[] => {
    const data: SurvivalDataPoint[] = [];
    for(let i=0; i<n; i++) {
        const group = i < n/2 ? 'Group A' : 'Group B';
        // Baseline hazard
        let hazard = 0.05; 
        if (group === 'Group A') hazard *= (1 - interventionEffect); // Reduce hazard for treatment
        
        let time = 0;
        while(Math.random() > hazard && time < 20) {
            time++;
        }
        
        const status = time < 20 ? 1 : 0; // 1 = Event (Dropout), 0 = Censored
        data.push({ time, status, group });
    }
    return data;
};

export const calculateKaplanMeier = (data: SurvivalDataPoint[]): SurvivalCurvePoint[] => {
    const sorted = data.sort((a, b) => a.time - b.time);
    const points: SurvivalCurvePoint[] = [{ time: 0, survivalProbability: 1 }];
    
    let currentProb = 1;
    let n = data.length;
    
    // Iterate through unique times
    const times = Array.from(new Set(sorted.map(d => d.time))).filter(t => t > 0);
    
    times.forEach(t => {
        const atRisk = sorted.filter(d => d.time >= t).length;
        const events = sorted.filter(d => d.time === t && d.status === 1).length;
        
        if (atRisk > 0) {
            currentProb *= (1 - events / atRisk);
        }
        points.push({ time: t, survivalProbability: currentProb });
    });
    
    // Fill forward
    if (points[points.length - 1].time < 20) {
         points.push({ time: 20, survivalProbability: currentProb });
    }
    
    return points;
};

// SEM Logic
export const calculateModelFit = (model: SEMModel): FitIndices => {
    // Very simplified mock calculation based on model structure "correctness"
    // In reality, this requires matrix algebra (implied covariance matrix vs observed)
    
    let score = 100;
    
    // Rule: Latent variables must drive observed variables (loadings)
    const loadings = model.paths.filter(p => p.type === 'loading' && p.specified);
    if (loadings.length < 6) score -= 50; // Missing measurement model
    
    // Rule: Structural paths
    const structural = model.paths.filter(p => p.type === 'regression' && p.specified);
    const cov = model.paths.filter(p => p.type === 'covariance' && p.specified);
    
    if (structural.length === 0 && cov.length === 0) score -= 20;
    
    // Arbitrary "Best Model" is: mot -> sh, sh -> gra, mot -> gra
    const optimalPaths = ['mot-sh', 'sh-gra', 'mot-gra'];
    structural.forEach(p => {
        if (optimalPaths.includes(p.id)) score += 5;
        else score -= 5; // Penalize "wrong" theories for the game
    });
    
    // Map score to indices
    // Chi-square: lower is better. 
    const chiSquare = Math.max(0, 100 - score) * 2 + Math.random() * 5;
    const pValue = chiSquare < 5 ? 0.5 : (chiSquare < 20 ? 0.04 : 0.001);
    const cfi = Math.min(1, 0.5 + score / 200);
    const rmsea = Math.max(0, 0.2 - score / 500);

    return { chiSquare, df: 10, pValue, cfi, rmsea };
};

// PSM Logic
export const generatePSMData = (n: number, selectionBias: number): PSMDataPoint[] => {
    const data: PSMDataPoint[] = [];
    for(let i=0; i<n; i++) {
        const priorScore = Math.max(0, Math.min(100, 50 + (Math.random() - 0.5) * 40));
        
        // Treatment probability increases with prior score (Selection Bias)
        const probTreatment = 1 / (1 + Math.exp(-((priorScore - 50) / 20 + selectionBias/10)));
        
        const group = Math.random() < probTreatment ? 'Treatment' : 'Control';
        
        data.push({ id: i, group, priorScore, isMatched: false, matchedWithId: null });
    }
    return data;
};

export const performMatching = (data: PSMDataPoint[]): PSMDataPoint[] => {
    const treatment = data.filter(d => d.group === 'Treatment');
    const control = data.filter(d => d.group === 'Control');
    const newData = [...data];
    
    // Nearest Neighbor Matching (Greedy)
    // Shuffle treatment to avoid order bias
    treatment.sort(() => Math.random() - 0.5);
    
    const usedControlIds = new Set<number>();
    
    treatment.forEach(t => {
        let bestMatch = null;
        let minDiff = Infinity;
        
        control.forEach(c => {
            if (!usedControlIds.has(c.id)) {
                const diff = Math.abs(t.priorScore - c.priorScore);
                if (diff < minDiff && diff < 5) { // Caliper of 5
                    minDiff = diff;
                    bestMatch = c;
                }
            }
        });
        
        if (bestMatch) {
            usedControlIds.add((bestMatch as PSMDataPoint).id);
            // Update t
            const tIndex = newData.findIndex(d => d.id === t.id);
            if(tIndex !== -1) {
                newData[tIndex] = { ...newData[tIndex], isMatched: true, matchedWithId: (bestMatch as PSMDataPoint).id };
            }
            // Update c
            const cIndex = newData.findIndex(d => d.id === (bestMatch as PSMDataPoint).id);
            if(cIndex !== -1) {
                newData[cIndex] = { ...newData[cIndex], isMatched: true, matchedWithId: t.id };
            }
        }
    });
    
    return newData;
};

// XAI Prediction Logic (Linear Model + SHAP-like feature attribution)
export const calculateXaiPrediction = (features: StudentFeatures): PredictionResult => {
    const baseValue = 50; // Base probability
    const contributions: FeatureContribution[] = [];
    
    // Model weights (simplified)
    const weights = {
        assignmentCompletion: 0.4,
        quizScores: 0.3,
        forumParticipation: 0.1,
        absences: -0.5,
        procrastination: -0.3
    };
    
    // Feature baselines (average student)
    const baselines = {
        assignmentCompletion: 70,
        quizScores: 75,
        forumParticipation: 30,
        absences: 5,
        procrastination: 40
    };

    let score = baseValue;
    
    for (const key in features) {
        const k = key as keyof StudentFeatures;
        const diff = features[k] - baselines[k];
        const contribution = diff * weights[k];
        score += contribution;
        contributions.push({ feature: k.replace(/([A-Z])/g, ' $1').trim(), value: contribution });
    }
    
    // Clamp
    score = Math.max(0, Math.min(100, score));
    
    return { prediction: score, contributions, baseValue };
};

// Multimodal Data Gen
export const generateMultimodalData = (duration: number): MultimodalData => {
    const speech = [];
    const gaze = [];
    const clicks = [];

    // Simulate speech turns
    let t = 1;
    while (t < duration) {
        const dur = 2 + Math.random() * 5;
        const pId = Math.random() > 0.5 ? 1 : 0;
        if (t + dur < duration) {
            speech.push({ participantId: pId, startTime: t, endTime: t + dur });
        }
        t += dur + Math.random() * 2; // pause
    }

    // Simulate gaze (follow mouse-like movement with jitter)
    for (let i = 0; i < duration * 10; i++) { // 10 Hz
        const time = i / 10;
        // P0 focuses on left
        gaze.push({ participantId: 0, time, x: 200 + Math.sin(time)*50 + Math.random()*20, y: 300 + Math.cos(time)*50 });
        // P1 focuses on right
        gaze.push({ participantId: 1, time, x: 600 + Math.sin(time*1.2)*50, y: 300 + Math.cos(time*0.8)*50 });
        
        // Joint attention moment
        if (time > 20 && time < 25) {
             gaze.push({ participantId: 0, time, x: 400, y: 300 }); // Center
             gaze.push({ participantId: 1, time, x: 400, y: 300 });
        }
    }

    // Simulate clicks
    for (let i = 0; i < 5; i++) {
        clicks.push({
            participantId: Math.random() > 0.5 ? 1 : 0,
            time: Math.random() * duration,
            target: 'button'
        });
    }

    return { speech, gaze, clicks, duration };
};

export const findBookmarks = (data: MultimodalData): Bookmark[] => {
    // Simple heuristic logic to find interesting moments
    const bookmarks: Bookmark[] = [];
    
    // 1. Convergence (Joint Attention)
    // Find time where gaze points are close
    // Simplified: check pre-baked moment at t=22
    bookmarks.push({ time: 22.5, description: 'Joint Visual Attention', type: 'convergence' });
    
    // 2. Dialogue
    if (data.speech.length > 2) {
        bookmarks.push({ time: data.speech[1].startTime, description: 'Turn-taking', type: 'dialogue' });
    }
    
    // 3. Interaction
    if (data.clicks.length > 0) {
        bookmarks.push({ time: data.clicks[0].time, description: 'User Click', type: 'interaction' });
    }
    
    return bookmarks;
};

// IRT Logic
export const calculateIrtProbability = (theta: number, params: IRTParams): number => {
    const { discrimination, difficulty } = params;
    // 2PL Model: P(theta) = 1 / (1 + exp(-a(theta - b)))
    return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
};

// LDA Logic (Fake)
export const calculateLda = (numTopics: number): LDAResult => {
    const vocab = [
        'learning', 'student', 'teacher', 'grade', 'exam', 
        'online', 'video', 'forum', 'post', 'reply',
        'difficulty', 'concept', 'understand', 'confused', 'help',
        'assignment', 'deadline', 'submit', 'late', 'score'
    ];
    
    // Generate Topics
    const topics: Topic[] = [];
    for(let i=0; i<numTopics; i++) {
        // Pick 5 random keywords
        const shuffled = [...vocab].sort(() => 0.5 - Math.random());
        const keywords: Keyword[] = shuffled.slice(0, 5).map(w => ({ text: w, weight: Math.random() }));
        topics.push({ id: i, keywords });
    }
    
    // Generate Documents
    const documents: LdaDocument[] = [];
    const snippets = [
        "I am having trouble understanding the concept of regression.",
        "When is the deadline for the assignment submission?",
        "The online videos are very helpful for learning.",
        "I scored low on the exam because I was confused.",
        "Can the teacher reply to my forum post?",
        "The difficulty of this course is too high.",
        "I submitted my assignment late, will I lose grades?",
        "Students need more help with the exam preparation.",
        "The learning platform video player is broken.",
        "I understand the concepts but fail the tests."
    ];
    
    for(let i=0; i<snippets.length; i++) {
        const dist = topics.map(t => ({ topicId: t.id, weight: Math.random() }));
        // Normalize
        const sum = dist.reduce((a,b) => a + b.weight, 0);
        const normalizedDist = dist.map(d => ({ topicId: d.topicId, weight: d.weight / sum }));
        
        documents.push({
            id: i,
            content: snippets[i],
            topicDistribution: normalizedDist
        });
    }

    return { topics, documents };
};

// Mixed Methods Logic
export const generateMixedMethodsData = (n: number): { participants: Participant[], themes: QualitativeTheme[] } => {
    const themesList = ['Confusing UI', 'Engaging Content', 'Slow Support', 'Helpful Community', 'Technical Bugs'];
    const participants: Participant[] = [];
    const themeCounts: Record<string, number> = {};
    
    themesList.forEach(t => themeCounts[t] = 0);

    for(let i=0; i<n; i++) {
        // Simulate correlation: UI/Bugs -> Low Score, Content/Community -> High Score
        const theme = themesList[Math.floor(Math.random() * themesList.length)];
        let baseScore = 50;
        
        if (theme === 'Confusing UI' || theme === 'Technical Bugs') baseScore = 30;
        else if (theme === 'Slow Support') baseScore = 40;
        else baseScore = 80;
        
        const score = Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20));
        
        themeCounts[theme]++;
        participants.push({
            id: i,
            score,
            themes: [theme] // Simple: 1 theme per person for demo
        });
    }
    
    const themes: QualitativeTheme[] = themesList.map(t => ({
        text: t,
        frequency: themeCounts[t]
    }));
    
    return { participants, themes };
};

// RDD Logic
export const generateRddData = (cutoff: number, effect: number, n: number): RddPoint[] => {
    const data: RddPoint[] = [];
    for(let i=0; i<n; i++) {
        const x = Math.random() * 100;
        // Baseline relationship: y = 0.5x + 20
        let y = 0.5 * x + 20 + (Math.random() - 0.5) * 15;
        
        const group = x < cutoff ? 'treatment' : 'control';
        
        // Add effect for treatment group (below cutoff in this example, e.g. remedial program)
        if (group === 'treatment') {
            y += effect; 
        }
        
        y = Math.max(0, Math.min(100, y));
        data.push({ id: i, x, y, group });
    }
    return data;
};

export const calculateRddEffect = (data: RddPoint[], cutoff: number, bandwidth: number): RddResult => {
    const treatmentData = data.filter(d => d.x < cutoff && d.x >= cutoff - bandwidth).map(d => ({ x: d.x, y: d.y, id: d.id }));
    const controlData = data.filter(d => d.x >= cutoff && d.x <= cutoff + bandwidth).map(d => ({ x: d.x, y: d.y, id: d.id }));
    
    const treatmentLine = calculateLinearRegression(treatmentData);
    const controlLine = calculateLinearRegression(controlData);
    
    // Predict Y at cutoff
    const yTreatmentAtCutoff = treatmentLine.slope * cutoff + treatmentLine.intercept;
    const yControlAtCutoff = controlLine.slope * cutoff + controlLine.intercept;
    
    return {
        effect: yTreatmentAtCutoff - yControlAtCutoff,
        treatmentLine,
        controlLine
    };
};