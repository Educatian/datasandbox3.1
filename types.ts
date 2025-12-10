export interface Point {
  id: number;
  x: number;
  y: number;
}

export interface GroupPoint extends Point {
    groupId: number;
}

export interface RegressionLine {
  slope: number;
  intercept: number;
}

export interface ResidualPoint extends Point {
  yHat: number; // Predicted y-value on the regression line
  residual: number;
}

export interface DistributionParams {
    mean: number;
    stdDev: number;
    size: number;
}

// Types for Hidden Markov Model (HMM)
export type HiddenState = 'Sunny' | 'Rainy';
export type Observation = 'Walk' | 'Read' | 'Clean';

export interface HMMSequenceItem {
  state: HiddenState;
  observation: Observation;
}

// Types for Confidence Intervals
export interface ConfidenceInterval {
    id: number;
    sampleMean: number;
    lowerBound: number;
    upperBound: number;
    captured: boolean;
}

// Types for Chi-Square Test
export type ContingencyTableData = number[][];

export interface ChiSquareResult {
    chi2: number;
    pValue: number;
    degreesOfFreedom: number;
    expected: number[][];
}

// Types for Logistic Regression
export interface LogisticPoint {
    id: number;
    x: number; // e.g., study hours
    outcome: 0 | 1; // e.g., 0 for Fail, 1 for Pass
}

export interface LogisticCurveParams {
    beta0: number; // Intercept
    beta1: number; // Coefficient for x
}

// Types for Decision Tree
export interface DecisionTreePoint {
    id: number;
    features: number[]; // [x, y]
    label: number; // 0 or 1
}

export interface DecisionTreeNode {
    id: string;
    // For split nodes
    splitFeatureIndex?: number;
    splitThreshold?: number;
    left?: DecisionTreeNode;
    right?: DecisionTreeNode;
    // For leaf nodes
    value?: number; // Predicted class label
    samples?: number;
    gini?: number;
}

// Types for K-Means
export interface KMeansPoint extends Point {
    clusterId: number | null;
}
export interface Centroid extends Point {}

// Types for Latent Profile Analysis (LPA)
export interface LPAPoint extends Point {
    profileId: number | null;
    responsibilities: number[]; // Probability of belonging to each profile
}

export interface Profile {
    id: number;
    mean: [number, number]; // [x, y]
    covariance: [[number, number], [number, number]];
    weight: number; // The mixing proportion
}

// Types for PCA
export interface PCA3DPoint {
    id: number;
    x: number;
    y: number;
    z: number;
}

export interface PCAResult {
    projectedData: Point[];
    principalComponents: number[][]; // eigenvectors
    explainedVarianceRatio: number[];
}

// Types for Time Series Analysis
export interface ValueTimePoint {
  id: number;
  time: number;
  value: number;
}

// Types for Sequential Pattern Mining (SPM) & Lag Sequential Analysis (LSA)
export type StudentAction = 'V' | 'Q' | 'A' | 'F' | 'P' | 'E';
// V: Video, Q: Quiz, A: Assignment, F: Forum, P: Pass, E: Error/Fail

export interface StudentSequence {
    id: number;
    group: 'Group A' | 'Group B';
    actions: StudentAction[];
}

export interface FrequentPattern {
    pattern: StudentAction[];
    support: number;
}

export interface TransitionMatrix {
    [from: string]: { [to: string]: number };
}

export interface LagAnalysisResult {
    observed: TransitionMatrix;
    expected: TransitionMatrix;
    zScores: TransitionMatrix;
}

// Types for Factor Analysis
export interface SurveyItem {
    id: string; // e.g., 'extra1'
    text: string; // 'I am the life of the party'
}

export interface FactorLoading {
    item: string; // item id
    [factor: string]: number | string; // e.g., factor1: 0.8, factor2: 0.1 ...
}

export interface FactorAnalysisResult {
    loadings: FactorLoading[];
    correlationMatrix: number[][];
    itemLabels: string[];
    explainedVariance: number[]; // per factor
}

// Types for Social Network Analysis (SNA)
export interface Interaction {
    source: number; // student ID
    target: number; // student ID
    time: number; // timestamp or step
}

export interface SNANode {
    id: number;
    degree: number;
}

export interface SNALink {
    source: number;
    target: number;
    time: number;
}

// Types for Knowledge Tracing
export interface BKTParams {
    learn: number;  // p(L) - probability of learning
    guess: number;  // p(G) - probability of guessing
    slip: number;   // p(S) - probability of slipping
}

export interface MasteryState {
    history: number[]; // History of mastery probabilities
}

// Types for Survival Analysis
export interface SurvivalDataPoint {
    time: number; // Time to event or censoring
    status: 0 | 1; // 1 = event occurred (e.g., dropout), 0 = censored (e.g., completed course)
    group: 'Group A' | 'Group B';
}

export interface SurvivalCurvePoint {
    time: number;
    survivalProbability: number;
}

// Types for Structural Equation Modeling (SEM)
export interface SEMVariable {
    id: string;
    type: 'latent' | 'observed';
    label: string;
    x?: number;
    y?: number;
}

export interface SEMPath {
    id:string;
    from: string;
    to: string;
    type: 'regression' | 'covariance' | 'loading';
    specified: boolean; // Whether the user has included this path in the model
    isStructural: boolean; // Is it a path between latent variables?
}

export interface SEMModel {
    variables: SEMVariable[];
    paths: SEMPath[];
}

export interface FitIndices {
    chiSquare: number;
    df: number;
    pValue: number;
    cfi: number;
    rmsea: number;
}

// Types for Propensity Score Matching (PSM)
export interface PSMDataPoint {
    id: number;
    group: 'Treatment' | 'Control';
    priorScore: number;
    isMatched: boolean;
    matchedWithId: number | null;
}

// Types for XAI for Prediction
export interface StudentFeatures {
    assignmentCompletion: number;
    quizScores: number;
    forumParticipation: number;
    absences: number;
    procrastination: number;
}

export interface FeatureContribution {
    feature: string;
    value: number; // The contribution value, can be positive or negative
}

export interface PredictionResult {
    prediction: number; // Final prediction score (0-100)
    contributions: FeatureContribution[];
    baseValue: number;
}

// Types for Multimodal Analysis
export interface SpeechSegment {
    participantId: number;
    startTime: number;
    endTime: number;
}

export interface GazePoint {
    participantId: number;
    time: number;
    x: number;
    y: number;
}

export interface ClickEvent {
    participantId: number;
    time: number;
    target: string;
}

export interface MultimodalData {
    speech: SpeechSegment[];
    gaze: GazePoint[];
    clicks: ClickEvent[];
    duration: number;
}

export interface Bookmark {
    time: number;
    description: string;
    type: 'convergence' | 'dialogue' | 'interaction';
}

// Types for Item Response Theory (IRT)
export interface IRTParams {
    discrimination: number; // 'a' parameter
    difficulty: number;     // 'b' parameter
}

// Types for Topic Modeling (LDA)
export interface Keyword {
    text: string;
    weight: number;
}

export interface Topic {
    id: number;
    keywords: Keyword[];
    name?: string; // Optional name from Gemini
}

export interface DocumentTopic {
    topicId: number;
    weight: number;
}

export interface LdaDocument {
    id: number;
    content: string;
    topicDistribution: DocumentTopic[];
}

export interface LDAResult {
    topics: Topic[];
    documents: LdaDocument[];
}

// Types for Mixed Methods Analysis
export interface QualitativeTheme {
    text: string;
    frequency: number;
}

export interface Participant {
    id: number;
    score: number; // Quantitative score
    themes: string[]; // Qualitative themes mentioned
}

// Types for Regression Discontinuity Design (RDD)
export interface RddPoint {
    id: number;
    x: number; // Pre-test score
    y: number; // Post-test score
    group: 'control' | 'treatment';
}

export interface RddResult {
    effect: number;
    controlLine: RegressionLine;
    treatmentLine: RegressionLine;
}