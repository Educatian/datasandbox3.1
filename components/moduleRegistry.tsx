import { lazy } from 'react';
import type React from 'react';

/**
 * Maps a ModuleDef.component key to its lazily-loaded component.
 * Every entry is code-split by Vite, so the portal stays light and a
 * module's chunk loads on first open.
 *
 * All module components accept { onBack } and optionally
 * { customTitle, customContext, moduleId }; extras are ignored.
 */
export interface ModuleProps {
    onBack: () => void;
    customTitle?: string;
    customContext?: string;
    moduleId?: string;
}

export const MODULE_REGISTRY: Record<string, React.ComponentType<any>> = {
    // --- Core curriculum games / sims ---
    'data-sorter': lazy(() => import('./DataSorterGame')),
    'god-mode': lazy(() => import('./GodModeSwitch')),
    'summation': lazy(() => import('./SummationMachine')),
    'rank-line': lazy(() => import('./RankLine')),
    'balance-beam': lazy(() => import('./BalanceBeam')),
    'dart-board': lazy(() => import('./DartBoard')),
    'coin-flipper': lazy(() => import('./CoinFlipper')),
    'signal-noise': lazy(() => import('./SignalNoiseRadio')),
    'effect-magnifier': lazy(() => import('./EffectSizeMagnifier')),
    'prediction-laser': lazy(() => import('./PredictionLaser')),
    'box-plot': lazy(() => import('./BoxPlotBuilder')),
    'mode-viz': lazy(() => import('./ModeVisualizer')),
    'galton-board': lazy(() => import('./GaltonBoard')),
    'p-hacking': lazy(() => import('./PHackingSim')),
    'anscombe': lazy(() => import('./DataDetective')),
    'power-game': lazy(() => import('./PowerAnalysisGame')),
    'prob-scanner-game': lazy(() => import('./ProbabilityScannerGame')),
    'painter-game': lazy(() => import('./PredictionPainterGame')),

    // --- Generic analysis wrappers (accept customTitle/customContext) ---
    'z-test': lazy(() => import('./ZTestAnalysis')),
    'regression': lazy(() => import('./RegressionAnalysis')),
    'correlation': lazy(() => import('./CorrelationAnalysis')),
    'confidence': lazy(() => import('./ConfidenceIntervalAnalysis')),

    // --- Advanced track: statistical methods ---
    'anova': lazy(() => import('./AnovaAnalysis')),
    'chi-square': lazy(() => import('./ChiSquareAnalysis')),
    'bayesian': lazy(() => import('./BayesianAnalysis')),
    'logistic': lazy(() => import('./LogisticRegressionAnalysis')),
    'multi-level': lazy(() => import('./MultiLevelAnalysis')),
    'factor-analysis': lazy(() => import('./FactorAnalysis')),
    'sem': lazy(() => import('./SEMAnalysis')),
    'psm': lazy(() => import('./PSMAnalysis')),
    'rdd': lazy(() => import('./RddAnalysis')),
    'survival': lazy(() => import('./SurvivalAnalysis')),
    'irt': lazy(() => import('./IRTAnalysis')),
    'mixed-methods': lazy(() => import('./MixedMethodsAnalysis')),

    // --- Advanced track: ML / educational data mining ---
    'decision-tree': lazy(() => import('./DecisionTreeAnalysis')),
    'k-means': lazy(() => import('./KMeansAnalysis')),
    'pca': lazy(() => import('./PCAAnalysis')),
    'lpa': lazy(() => import('./LPAAnalysis')),
    'hmm': lazy(() => import('./HMMAnalysis')),
    'knowledge-tracing': lazy(() => import('./KnowledgeTracingAnalysis')),
    'spm': lazy(() => import('./SPMAnalysis')),
    'lsa': lazy(() => import('./LSAAnalysis')),
    'sequential': lazy(() => import('./SequentialAnalysis')),
    'sna': lazy(() => import('./SNAAnalysis')),
    'topic-modeling': lazy(() => import('./TopicModelingAnalysis')),
    'xai': lazy(() => import('./XAIAnalysis')),
    'multimodal': lazy(() => import('./MultimodalAnalysis')),
};
