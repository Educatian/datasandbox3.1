// Checkpoint assessment item bank.
//
// These are ORIGINAL items written for Data Sandbox, keyed to the documented
// misconceptions in data/misconceptions.ts. They are deliberately in the
// spirit of validated instruments (CAOS, BLIS, GOALS) but are NOT items from
// those instruments: if you hold a license/permission for a validated
// instrument, replace the ITEMS array with its items and keep the shape.

export interface AssessmentOption {
    id: string;
    text: string;
    correct?: boolean;
    misconception?: string; // id into data/misconceptions.ts
}

export interface AssessmentItem {
    id: string;
    concept: string;
    stem: string;
    options: AssessmentOption[];
}

export const ITEMS: AssessmentItem[] = [
    {
        id: 'sampling-hospital',
        concept: 'SamplingVariability',
        stem: 'A city has a large clinic (about 80 births/day) and a small clinic (about 12 births/day). Over a year, which clinic records MORE days where over 70% of births are boys?',
        options: [
            { id: 'large', text: 'The large clinic', misconception: 'larger_n_more_variable' },
            { id: 'small', text: 'The small clinic', correct: true },
            { id: 'same', text: 'About the same for both' },
            { id: 'neither', text: 'Neither: 70% boy-days essentially never happen at any clinic' },
        ],
    },
    {
        id: 'ci-interpretation',
        concept: 'ConfidenceInterval',
        stem: 'A study reports a 95% confidence interval of [72, 78] for the mean exam score. Which statement is the best interpretation?',
        options: [
            { id: 'data', text: 'About 95% of the students scored between 72 and 78', misconception: 'ci_contains_data' },
            { id: 'procedure', text: 'Intervals built this way capture the true mean in about 95% of repeated samples', correct: true },
            { id: 'prob', text: 'There is a 95% probability the true mean moves between 72 and 78' },
            { id: 'sample', text: 'The sample mean has a 95% chance of being in [72, 78]' },
        ],
    },
    {
        id: 'p-value-meaning',
        concept: 'Probability_Binomial',
        stem: 'A test of a new tutoring program gives p = .03. What does this p-value mean?',
        options: [
            { id: 'h0prob', text: 'There is a 3% chance the program has no effect', misconception: 'p_value_h0_prob' },
            { id: 'data-given-h0', text: 'If the program had no effect, data this extreme would occur about 3% of the time', correct: true },
            { id: 'effect-size', text: 'The program improved scores by about 3%' },
            { id: 'replicate', text: 'There is a 97% chance a replication will also be significant' },
        ],
    },
    {
        id: 'sd-comparison',
        concept: 'SD_Variance',
        stem: 'Archers A (SD = 4 cm) and B (SD = 12 cm) both aim at the same bullseye with unbiased aim. Which statement must be true over many shots?',
        options: [
            { id: 'b-off', text: "B's average position will drift away from the bullseye", misconception: 'spread_shifts_mean' },
            { id: 'a-always', text: "Every shot from A lands closer than every shot from B", misconception: 'sd_as_strict_bound' },
            { id: 'both-centered', text: 'Both average near the bullseye; B is simply more spread out', correct: true },
            { id: 'cannot', text: 'Nothing can be concluded without the means' },
        ],
    },
    {
        id: 'mean-median-outlier',
        concept: 'Mean_Balance',
        stem: 'Nine employees earn about $50k and the CEO earns $5M. Adding the CEO to the calculation mostly changes…',
        options: [
            { id: 'both', text: 'The mean and the median by similar amounts' },
            { id: 'mean', text: 'The mean a lot; the median barely moves', correct: true },
            { id: 'median', text: 'The median a lot; the mean barely moves' },
            { id: 'robust', text: 'Neither: one value out of ten cannot move either much', misconception: 'mean_robust_to_outliers' },
        ],
    },
    {
        id: 'fair-coin-streak',
        concept: 'Probability_Binomial',
        stem: 'A fair coin has just landed heads 5 times in a row. What is the probability the next flip is heads?',
        options: [
            { id: 'less', text: 'Less than 1/2: tails is due', misconception: 'gamblers_fallacy' },
            { id: 'half', text: 'Exactly 1/2', correct: true },
            { id: 'more', text: 'More than 1/2: the coin is showing a hot streak' },
            { id: 'biased', text: 'It cannot be a fair coin after 5 heads in a row', misconception: 'streak_means_bias' },
        ],
    },
    {
        id: 'multiple-tests',
        concept: 'PHacking_Ethics',
        stem: 'A lab tests 20 unrelated food ingredients for a link to memory, each at alpha = .05. One ingredient comes out significant. The most defensible conclusion is…',
        options: [
            { id: 'discovery', text: 'That ingredient affects memory', misconception: 'significant_means_real' },
            { id: 'expected', text: 'About one significant result was expected by chance; it needs replication', correct: true },
            { id: 'all-null', text: 'The other 19 ingredients are proven to have no effect' },
            { id: 'design', text: 'The experiment was badly designed because most tests failed' },
        ],
    },
    {
        id: 'correlation-causation',
        concept: 'Prediction_Regression',
        stem: 'Across cities, ice-cream sales correlate strongly (r = .85) with drowning deaths. The best conclusion is…',
        options: [
            { id: 'causal', text: 'Ice cream consumption increases drowning risk', misconception: 'correlation_is_causation' },
            { id: 'reverse', text: 'Drownings increase ice-cream sales' },
            { id: 'third', text: 'A third variable (such as summer weather) can produce the association', correct: true },
            { id: 'spurious', text: 'An r of .85 across cities is too high to be real' },
        ],
    },
];
