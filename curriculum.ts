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

//================================================
// Advanced Track — research methods & EDM modules
// (components existed but were unreachable before;
// visibility is admin-controlled like everything else)
//================================================

export const ADVANCED_TRACK: AssessmentDef[] = [
    {
        id: 'advanced-01',
        title: 'Advanced Inference',
        subTitle: 'Beyond two groups',
        modules: [
            {
                id: 'anova', title: 'ANOVA Analysis',
                description: 'Compare the means of three groups at once with the F-statistic.',
                manipulation: 'Drag group means apart and squeeze their spreads to pump the F-statistic.',
                component: 'anova'
            },
            {
                id: 'chi-square', title: 'Chi-Square Test',
                description: 'Independence of categorical variables in a contingency table.',
                manipulation: 'Edit the contingency table counts and watch expected vs. observed clash.',
                component: 'chi-square'
            },
            {
                id: 'bayesian', title: 'Bayesian Updater',
                description: 'Prior beliefs + evidence = posterior beliefs.',
                manipulation: 'Set a prior about a coin, flip it, and watch the Beta posterior sharpen.',
                component: 'bayesian'
            },
            {
                id: 'multi-level', title: 'Multi-Level Modeler',
                description: 'Students nested in schools: random intercepts and slopes.',
                manipulation: 'Crank up between-group variance and watch group lines fan out.',
                component: 'multi-level'
            },
            {
                id: 'mixed-methods', title: 'Mixed Methods Linker',
                description: 'Connect qualitative themes to quantitative scores.',
                manipulation: 'Click a theme cloud word to see that subgroup\'s score distribution.',
                component: 'mixed-methods'
            }
        ]
    },
    {
        id: 'advanced-02',
        title: 'Causal Inference',
        subTitle: 'From correlation to cause',
        modules: [
            {
                id: 'psm', title: 'Propensity Score Matching',
                description: 'Balance selection bias by matching comparable students.',
                manipulation: 'Inject selection bias, then run matching and watch the groups balance.',
                component: 'psm'
            },
            {
                id: 'rdd', title: 'Regression Discontinuity',
                description: 'Estimate a treatment effect from a cutoff rule.',
                manipulation: 'Move the cutoff and effect size; read the jump at the threshold.',
                component: 'rdd'
            },
            {
                id: 'sem', title: 'SEM Builder',
                description: 'Draw a structural equation model and check its fit.',
                manipulation: 'Toggle paths between latent variables and chase a better CFI/RMSEA.',
                component: 'sem'
            },
            {
                id: 'survival', title: 'Survival Analysis',
                description: 'Kaplan-Meier curves of who persists and who drops out.',
                manipulation: 'Strengthen the intervention and watch the survival curves separate.',
                component: 'survival'
            }
        ]
    },
    {
        id: 'advanced-03',
        title: 'Measurement',
        subTitle: 'Quantifying knowledge itself',
        modules: [
            {
                id: 'irt', title: 'Item Response Theory',
                description: '2PL item characteristic curves: difficulty and discrimination.',
                manipulation: 'Bend the ICC with the a/b parameter sliders.',
                component: 'irt'
            },
            {
                id: 'factor-analysis', title: 'Factor Analyzer',
                description: 'Find the latent traits behind survey items.',
                manipulation: 'Generate survey data and watch items cluster onto factors.',
                component: 'factor-analysis'
            },
            {
                id: 'knowledge-tracing', title: 'Knowledge Tracer (BKT)',
                description: 'Bayesian Knowledge Tracing of a student\'s mastery.',
                manipulation: 'Feed correct/incorrect answers and tune learn/guess/slip rates.',
                component: 'knowledge-tracing'
            }
        ]
    },
    {
        id: 'advanced-04',
        title: 'Machine Learning',
        subTitle: 'Prediction and pattern discovery',
        modules: [
            {
                id: 'logistic', title: 'Logistic Regression',
                description: 'An S-curve that turns scores into probabilities.',
                manipulation: 'Drag points across the boundary and watch the curve re-fit (real IRLS).',
                component: 'logistic'
            },
            {
                id: 'decision-tree', title: 'Decision Tree',
                description: 'Recursive splits that carve up the feature space.',
                manipulation: 'Limit depth and min-samples to fight overfitting.',
                component: 'decision-tree'
            },
            {
                id: 'k-means', title: 'K-Means Clusterer',
                description: 'Iterative centroid dance toward stable clusters.',
                manipulation: 'Step through assign/update rounds and watch inertia fall.',
                component: 'k-means'
            },
            {
                id: 'pca', title: 'PCA Projector',
                description: 'Squash 3D data onto its most informative plane.',
                manipulation: 'Rotate the cloud and project it onto the principal components.',
                component: 'pca'
            },
            {
                id: 'lpa', title: 'Latent Profile Analyzer',
                description: 'Soft clustering: every student belongs to every profile, partially.',
                manipulation: 'Run EM steps and watch responsibilities sharpen into profiles.',
                component: 'lpa'
            },
            {
                id: 'xai', title: 'Explainable AI',
                description: 'Why did the model predict that? Feature contributions.',
                manipulation: 'Move a student\'s features and watch each contribution bar push the prediction.',
                component: 'xai'
            }
        ]
    },
    {
        id: 'advanced-05',
        title: 'Learning Analytics',
        subTitle: 'Sequences, networks, text, and signals',
        modules: [
            {
                id: 'hmm', title: 'Hidden Markov Model',
                description: 'Infer hidden states from observable behavior.',
                manipulation: 'Tune transition probabilities and watch activity sequences change.',
                component: 'hmm'
            },
            {
                id: 'spm', title: 'Sequential Pattern Miner',
                description: 'Frequent behavior patterns of high vs. low achievers.',
                manipulation: 'Raise minimum support and watch noise patterns drop out.',
                component: 'spm'
            },
            {
                id: 'lsa', title: 'Lag Sequential Analyzer',
                description: 'Which action significantly follows which?',
                manipulation: 'Switch the lag and compare transition z-scores between groups.',
                component: 'lsa'
            },
            {
                id: 'sequential', title: 'Time Series Explorer',
                description: 'Trends, cycles, and smoothing in longitudinal data.',
                manipulation: 'Widen the moving-average window until the seasonality emerges.',
                component: 'sequential'
            },
            {
                id: 'sna', title: 'Social Network Analyzer',
                description: 'Who talks to whom: centrality and isolation in class networks.',
                manipulation: 'Generate interactions and find the hub and the isolated students.',
                component: 'sna'
            },
            {
                id: 'topic-modeling', title: 'Topic Modeler (LDA)',
                description: 'Discover themes in a pile of student essays.',
                manipulation: 'Change the number of topics and name what emerges.',
                component: 'topic-modeling'
            },
            {
                id: 'multimodal', title: 'Multimodal Analyzer',
                description: 'Speech, gaze, and clicks on one timeline.',
                manipulation: 'Scrub the timeline to the auto-bookmarked joint-attention moment.',
                component: 'multimodal'
            }
        ]
    }
];

//================================================
// Research & capstone track: the full investigative
// cycle plus pre/post conceptual checkpoints
//================================================

export const RESEARCH_TRACK: AssessmentDef[] = [
    {
        id: 'research-01',
        title: 'Your Investigation',
        subTitle: 'The whole cycle, your question',
        modules: [
            {
                id: 'checkpoint-pre', title: 'Checkpoint: Before You Begin',
                description: 'An 8-question conceptual baseline (with research consent). Not graded; honesty is the point.',
                manipulation: 'Answer 8 quick conceptual questions before touching the simulations.',
                component: 'checkpoint'
            },
            {
                id: 'capstone', title: 'Capstone: Your Investigation',
                description: 'Pose a question, pick real data (or upload your own), explore it, and write a defensible conclusion.',
                manipulation: 'Run the full investigative cycle and generate a printable lab report.',
                component: 'capstone'
            },
            {
                id: 'checkpoint-post', title: 'Checkpoint: After the Journey',
                description: 'The same 8 concepts, after the sandbox. The difference is your learning, measured.',
                manipulation: 'Retake the conceptual checkpoint and compare with your baseline.',
                component: 'checkpoint'
            }
        ]
    }
];

export const ALL_TRACKS: AssessmentDef[] = [...CURRICULUM, ...ADVANCED_TRACK, ...RESEARCH_TRACK];

// Modules exposed in the public demo mode (?demo=1 on production builds):
// a curated tour of the flagship interactions, no account required.
export const DEMO_MODULE_IDS: string[] = [
    'data-sorter',      // drag-and-drop measurement scales
    'galton-board',     // CLT + PredictGate
    'dart-board',       // SD + PredictGate + missions
    'coin-flipper',     // p-values + PredictGate
    'p-hacking',        // multiple comparisons + PredictGate
    'power-triangle',   // power station game
    'correlation-maker', // real data + missions + class dataset
    'residual-rain',    // regression + missions
    'anova',            // advanced track taste + scenario skin
];

//================================================
// Endogenous scenario skins for the Advanced Track
// (Malone & Lepper: fantasy tied to skillful use of
// the concept itself, not decoration). Rendered as a
// role/mission banner above the module.
//================================================

export interface ModuleScenario {
    role: string;
    mission: string;
}

export const MODULE_SCENARIOS: Record<string, ModuleScenario> = {
    'anova': {
        role: 'Program evaluator for a school district',
        mission: 'Three teaching programs, three sets of scores. Decide whether the differences between programs are bigger than the noise within them, and defend your call with F and p.'
    },
    'chi-square': {
        role: 'Forensic data journalist',
        mission: 'Readers claim the outcome had nothing to do with group membership. Test whether the two categorical variables are really independent before you publish.'
    },
    'bayesian': {
        role: 'Quality inspector with a suspicious coin',
        mission: 'You start with a belief, the data starts arguing. Update your prior with each flip and report how strong your posterior conviction has become.'
    },
    'multi-level': {
        role: 'Education researcher across 12 schools',
        mission: 'Students sit inside classrooms inside schools. Separate the school-level story from the student-level story before someone averages it all away.'
    },
    'mixed-methods': {
        role: 'UX researcher closing the loop',
        mission: 'Interview themes on one side, satisfaction scores on the other. Find which qualitative theme actually travels with the numbers.'
    },
    'psm': {
        role: 'Policy analyst under deadline',
        mission: 'The treatment group started ahead, so a raw comparison would flatter the program. Match comparable students first, then estimate the real effect.'
    },
    'rdd': {
        role: 'Scholarship program auditor',
        mission: 'Students just below the cutoff got the program, students just above did not. Use the jump at the threshold to estimate what the program actually did.'
    },
    'sem': {
        role: 'Theory builder defending a model',
        mission: 'You believe motivation drives study habits, which drive grades. Draw the paths, check CFI and RMSEA, and find out whether your theory survives contact with data.'
    },
    'survival': {
        role: 'Student-success coordinator',
        mission: 'Every week, some students drop out. Compare survival curves with and without mentoring and decide whether the program is keeping students enrolled.'
    },
    'irt': {
        role: 'Test designer building an item bank',
        mission: 'Tune an item\'s difficulty and discrimination, and decide which ability range this question actually measures well.'
    },
    'factor-analysis': {
        role: 'Survey methodologist',
        mission: 'Six questions, but how many underlying traits? Find the latent factors hiding behind the item correlations and name them.'
    },
    'knowledge-tracing': {
        role: 'Adaptive-tutor engineer',
        mission: 'The system must guess what a student knows from right/wrong answers alone. Tune learn, guess, and slip until the mastery estimate behaves sensibly.'
    },
    'logistic': {
        role: 'Early-warning system designer',
        mission: 'Predict a pass/fail outcome from one predictor. Fit the S-curve, find the decision boundary, and decide where the risk really starts.'
    },
    'decision-tree': {
        role: 'Triage rule designer',
        mission: 'Carve the feature space into decision rules a human can read. Then fight overfitting: how deep is too deep?'
    },
    'k-means': {
        role: 'Learner-profile discoverer',
        mission: 'Nobody labeled these students. Run the centroid dance, watch inertia fall, and decide how many groups the data actually supports.'
    },
    'pca': {
        role: 'Dimensionality negotiator',
        mission: 'Three correlated measures, one budget for two axes. Find the projection that keeps the most variance and report what was lost.'
    },
    'lpa': {
        role: 'Typology researcher',
        mission: 'Students may belong to hidden profiles, partially. Run EM until the soft memberships sharpen, and defend your choice of profile count.'
    },
    'xai': {
        role: 'Accountable-AI officer',
        mission: 'The model flagged a student as at-risk. Decompose the prediction into feature contributions and explain it in one sentence a teacher can act on.'
    },
    'hmm': {
        role: 'Behavior decoder',
        mission: 'You can only see actions, not states. Tune the transition probabilities until the hidden weather behind the activity sequence becomes legible.'
    },
    'spm': {
        role: 'Learning-analytics miner',
        mission: 'High and low achievers leave different action trails. Mine the frequent sequences and report the pattern that separates them.'
    },
    'lsa': {
        role: 'Interaction sequence analyst',
        mission: 'Which action significantly FOLLOWS which? Compare lag-1 transitions across groups and find the transition that defines each group.'
    },
    'sequential': {
        role: 'Trend forecaster',
        mission: 'The raw series is noise on top of signal. Widen the smoothing window until the seasonality emerges, without erasing it.'
    },
    'sna': {
        role: 'Classroom community designer',
        mission: 'Map who talks to whom. Find the hub carrying the class and the isolated student nobody noticed, then decide where one new connection would matter most.'
    },
    'topic-modeling': {
        role: 'Essay-corpus cartographer',
        mission: 'A pile of student essays, no labels. Choose the number of topics, read the keyword clusters, and give each discovered theme an honest name.'
    },
    'multimodal': {
        role: 'Collaboration analyst',
        mission: 'Speech, gaze, and clicks on one timeline. Scrub to the auto-bookmarked moment and judge: was that joint attention or coincidence?'
    },
    'capstone': {
        role: 'Principal investigator',
        mission: 'No more training wheels: pose your own question, choose your own data, and defend a conclusion whose scope you can justify.'
    },
};

export const getModuleDef = (id: string, tracks: AssessmentDef[] = ALL_TRACKS): ModuleDef | null => {
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
