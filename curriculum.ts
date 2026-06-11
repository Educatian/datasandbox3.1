//================================================
// Curriculum Data
//
// The single source of truth for what modules exist,
// how they are grouped, and which registered component
// renders each one (see components/moduleRegistry.tsx).
//================================================

export interface ModuleDef {
    id: string;
    title: string;
    description: string;
    manipulation: string;
    component: string; // key into MODULE_REGISTRY
}

export interface AssessmentDef {
    id: string;
    title: string;
    subTitle: string;
    modules: ModuleDef[];
}

export const CURRICULUM: AssessmentDef[] = [
    {
        id: 'assessment-01',
        title: 'The Foundation',
        subTitle: 'Mathematical symbols → Concrete objects',
        modules: [
            {
                id: 'data-sorter', title: 'The Data Sorter',
                description: 'Sort data capsules into Nominal, Ordinal, Interval, Ratio pipes.',
                manipulation: 'Drag floating data capsules to the correct measurement scale pipe.',
                component: 'data-sorter'
            },
            {
                id: 'god-mode', title: 'The God Mode Switch',
                description: 'Experimental vs. Observational studies.',
                manipulation: 'Toggle between Observational (locked) and Experimental (adjustable) modes to see causality.',
                component: 'god-mode'
            },
            {
                id: 'summation-machine', title: 'The Summation Machine',
                description: 'Visualizing Sigma notation.',
                manipulation: 'Dial the range i=1 to n=4 and watch numbers get sucked into the machine.',
                component: 'summation'
            }
        ]
    },
    {
        id: 'assessment-02',
        title: 'Visualization',
        subTitle: 'Data as Shape, not just numbers',
        modules: [
            {
                id: 'bin-squeezer', title: 'The Bin Squeezer',
                description: 'Histogram bin widths and distortion.',
                manipulation: 'Squeeze the bin width slider to see the histogram change shape from detailed to blocky.',
                component: 'z-test' // Using Z-Test distribution view as proxy
            },
            {
                id: 'rank-line', title: 'The Rank Line',
                description: 'Percentiles and Quartiles.',
                manipulation: 'Place a flag at the 75th percentile to highlight the top quartile.',
                component: 'rank-line'
            },
            {
                id: 'box-plot', title: 'The Box Plot Packer',
                description: 'Median, IQR, and Whiskers.',
                manipulation: 'Drag data points to reshape the Box & Whisker plot in real-time.',
                component: 'box-plot'
            }
        ]
    },
    {
        id: 'assessment-03',
        title: 'Central Tendency',
        subTitle: 'Sensitivity of statistics',
        modules: [
            {
                id: 'balance-beam', title: 'The Balance Beam',
                description: 'Mean vs. Median sensitivity.',
                manipulation: 'Throw a weight (outlier) far to the side and watch the fulcrum (Mean) shift while the Median stays put.',
                component: 'balance-beam'
            },
            {
                id: 'dart-board', title: 'The Dart Board',
                description: 'Standard Deviation as spread.',
                manipulation: 'Turn the "Spread" dial to see shots scatter (High SD) or cluster (Low SD).',
                component: 'dart-board'
            },
            {
                id: 'mode-viz', title: 'The Mode Magnet',
                description: 'Mode as the most frequent value.',
                manipulation: 'Stack blocks to build the tallest tower.',
                component: 'mode-viz'
            }
        ]
    },
    {
        id: 'assessment-04',
        title: 'Normal Distribution',
        subTitle: 'Probability as Area',
        modules: [
            {
                id: 'prob-scanner', title: 'The Probability Scanner',
                description: 'Z-Scores and Area under the curve.',
                manipulation: 'Drag the laser scanner across the curve to paint the area and calculate probability.',
                component: 'prob-scanner-game'
            },
            {
                id: 'sample-pumper', title: 'The Sample Size Pumper',
                description: 'Sampling Distribution & Standard Error.',
                manipulation: 'Pump the sample size (n) from 5 to 100 and watch the distribution sharpen.',
                component: 'confidence'
            },
            {
                id: 'galton-board', title: 'The Galton Board',
                description: 'Central Limit Theorem.',
                manipulation: 'Drop balls through pegs to see them naturally form a Bell Curve.',
                component: 'galton-board'
            }
        ]
    },
    {
        id: 'assessment-05',
        title: 'Hypothesis Testing',
        subTitle: 'Decision and Risk',
        modules: [
            {
                id: 'coin-flipper', title: 'The Coin Flipper',
                description: 'Null Hypothesis & P-Values.',
                manipulation: 'Flip a coin repeatedly. If you get 10 heads in a row, the "P-Value Meter" drops into the rejection zone.',
                component: 'coin-flipper'
            },
            {
                id: 'radar-detector', title: 'The Radar Detector',
                description: 'Type I & Type II Errors.',
                manipulation: 'Move the detection threshold (Alpha) to balance False Alarms vs. Missed Signals.',
                component: 'z-test'
            },
            {
                id: 'p-hacking', title: 'The P-Hacking Fisher',
                description: 'Multiple Comparisons Problem.',
                manipulation: 'Run 20 random experiments at once. See how easy it is to find a "significant" result by chance.',
                component: 'p-hacking'
            }
        ]
    },
    {
        id: 'assessment-06',
        title: 'One-Sample t-Test',
        subTitle: 'Uncertainty in small samples',
        modules: [
            {
                id: 'signal-noise', title: 'The Signal-to-Noise Radio',
                description: 'The t-statistic formula visualized.',
                manipulation: 'Increase the Signal (Mean Diff) or reduce the Noise (Std Error) to get a clear t-value reception.',
                component: 'signal-noise'
            },
            {
                id: 'tail-stretcher', title: 'The Tail Stretcher',
                description: 't-distribution vs. Z-distribution.',
                manipulation: 'Lower sample size (n) to see the distribution tails get fatter and the center drop.',
                component: 'confidence'
            }
        ]
    },
    {
        id: 'assessment-07',
        title: 'Independent t-Test',
        subTitle: 'Difference and Uncertainty',
        modules: [
            {
                id: 'variance-equalizer', title: 'The Variance Equalizer',
                description: 'Homogeneity of Variance.',
                manipulation: 'Adjust the spread of one group. If they differ too much, a warning light triggers.',
                component: 'z-test'
            },
            {
                id: 'overlap-slider', title: 'The Overlap Slider',
                description: 'Mean Difference and p-values.',
                manipulation: 'Drag the two distributions apart. As overlap decreases, watch the t-value rise.',
                component: 'z-test'
            }
        ]
    },
    {
        id: 'assessment-08',
        title: 'Power & Effect Size',
        subTitle: 'Designing for Success',
        modules: [
            {
                id: 'power-triangle', title: 'The Power Station',
                description: 'G*Power relationships gamified.',
                manipulation: 'Manage Sample Size (Fuel) and Alpha (Safety) to generate enough statistical Power to light the city.',
                component: 'power-game'
            },
            {
                id: 'effect-magnifier', title: 'The Effect Size Magnifier',
                description: 'Visualizing Effect Size as Contrast.',
                manipulation: 'Adjust contrast (Effect Size) and density (Sample Size) to detect the difference between two particle clouds.',
                component: 'effect-magnifier'
            }
        ]
    },
    {
        id: 'assessment-09',
        title: 'Correlation',
        subTitle: 'Pattern Seeking',
        modules: [
            {
                id: 'correlation-maker', title: 'The Correlation Maker',
                description: 'Pearson’s r and Outliers.',
                manipulation: 'Click to add points. Add an outlier to crash the r-value.',
                component: 'correlation'
            },
            {
                id: 'prediction-laser', title: 'The Prediction Laser',
                description: 'Correlation as Precision of Control.',
                manipulation: 'Move the input slider. High correlation means the laser output follows precisely; low correlation means it jitters wildly.',
                component: 'prediction-laser'
            },
            {
                id: 'anscombe', title: 'The Data Detective',
                description: 'The importance of visualization.',
                manipulation: 'Interact with 4 datasets that look completely different but share identical statistics.',
                component: 'anscombe'
            }
        ]
    },
    {
        id: 'assessment-10',
        title: 'Regression',
        subTitle: 'Prediction and Error',
        modules: [
            {
                id: 'residual-rain', title: 'The Residual Rain',
                description: 'Regression Line & Least Squares.',
                manipulation: 'Tilt the line manually. Watch the "rain" (residuals) minimize at the best fit.',
                component: 'regression'
            },
            {
                id: 'prediction-painter', title: 'The Prediction Painter',
                description: 'R-squared and Explained Variance.',
                manipulation: 'Tighten the points to the line to fill the R-squared gauge.',
                component: 'painter-game'
            }
        ]
    }
];

export const getModuleDef = (id: string, tracks: AssessmentDef[] = CURRICULUM): ModuleDef | null => {
    for (const assessment of tracks) {
        const found = assessment.modules.find(m => m.id === id);
        if (found) return found;
    }
    return null;
};

//================================================
// Section themes (literal Tailwind classes only —
// the compiler scans source text for class names)
//================================================

export interface SectionTheme {
    titleColor: string;
    borderColor: string;
    bgColor: string;
    accentColor: string;
    hoverBorder: string;
    icon: string;
    glow: string;
}

export const SECTION_THEMES: SectionTheme[] = [
    {
        titleColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/30',
        bgColor: 'bg-cyan-500/5',
        accentColor: 'text-cyan-400',
        hoverBorder: 'hover:border-cyan-400',
        icon: 'text-cyan-500/20',
        glow: 'bg-cyan-500/30'
    },
    {
        titleColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
        bgColor: 'bg-emerald-500/5',
        accentColor: 'text-emerald-400',
        hoverBorder: 'hover:border-emerald-400',
        icon: 'text-emerald-500/20',
        glow: 'bg-emerald-500/30'
    },
    {
        titleColor: 'text-violet-400',
        borderColor: 'border-violet-500/30',
        bgColor: 'bg-violet-500/5',
        accentColor: 'text-violet-400',
        hoverBorder: 'hover:border-violet-400',
        icon: 'text-violet-500/20',
        glow: 'bg-violet-500/30'
    },
    {
        titleColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/5',
        accentColor: 'text-amber-400',
        hoverBorder: 'hover:border-amber-400',
        icon: 'text-amber-500/20',
        glow: 'bg-amber-500/30'
    },
    {
        titleColor: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        bgColor: 'bg-rose-500/5',
        accentColor: 'text-rose-400',
        hoverBorder: 'hover:border-rose-400',
        icon: 'text-rose-500/20',
        glow: 'bg-rose-500/30'
    }
];
