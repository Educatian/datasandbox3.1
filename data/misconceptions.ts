// Misconception feedback bank.
//
// Each entry names a misconception documented in the statistics-education
// literature, explains what is actually true, and tells the learner what to
// watch in the simulation to see it for themselves (predict-observe-explain).
// PredictGate options reference these by id; commits are logged with the
// misconception tag, turning clicks into measurable conceptual variables.

export interface Misconception {
    id: string;
    /** Short human-readable name */
    label: string;
    /** What the learner (incorrectly) believes */
    belief: string;
    /** What is actually true */
    truth: string;
    /** What to watch in the simulation to confront the belief */
    watchFor: string;
    /** Literature anchor */
    source: string;
}

export const MISCONCEPTIONS: Record<string, Misconception> = {
    uniform_outcome_belief: {
        id: 'uniform_outcome_belief',
        label: 'Randomness must be uniform',
        belief: 'If each step is 50/50 random, every final outcome should be equally likely.',
        truth: 'Equally likely steps do not make equally likely totals: there are many more peg paths to the middle bins than to the edges, so the totals pile into a bell shape.',
        watchFor: 'Count how many balls reach the outermost bins versus the middle ones as the pile grows.',
        source: 'Garfield & Ben-Zvi (2007), reasoning about distribution; Konold (1989)',
    },
    randomness_no_pattern: {
        id: 'randomness_no_pattern',
        label: 'Randomness has no pattern',
        belief: 'Because each ball is random, the overall result is unpredictable and different every time.',
        truth: 'Individual outcomes are unpredictable, but the aggregate is extremely predictable: that stability of the long run is the whole foundation of statistics.',
        watchFor: 'Reset and rerun the board: single balls land differently, but the pile shape comes back every time.',
        source: "Konold (1989) 'outcome approach' to randomness",
    },
    random_walk_divergence: {
        id: 'random_walk_divergence',
        label: 'Random steps drift outward',
        belief: 'Repeated random bounces should carry balls far from the center.',
        truth: 'Left and right bounces mostly cancel out; extreme totals require long unbroken streaks, which are rare. Sums of random steps concentrate near the center.',
        watchFor: 'Watch how often a ball bounces the same direction five times in a row, which is what reaching the edge requires.',
        source: 'Chance, delMas & Garfield (2004), sampling distribution reasoning',
    },
    spread_shifts_mean: {
        id: 'spread_shifts_mean',
        label: 'Spread moves the center',
        belief: 'More variability means the values (and their average) end up farther from the target.',
        truth: 'Spread and center are independent: a high-SD shooter is inconsistent but still centered on the bullseye on average.',
        watchFor: "Compare both players' average positions, not just how scattered their shots look.",
        source: 'delMas & Liu (2005), understanding of standard deviation',
    },
    sd_as_strict_bound: {
        id: 'sd_as_strict_bound',
        label: 'SD as a hard boundary',
        belief: 'A small SD means every single value lands closer than any value from a large-SD process.',
        truth: 'SD describes typical deviation, not a wall: a low-SD player still throws occasional wild darts, and a high-SD player sometimes hits dead center.',
        watchFor: "Look for at least one of Player B's darts landing closer to center than one of Player A's.",
        source: 'delMas & Liu (2005)',
    },
    variability_invisible: {
        id: 'variability_invisible',
        label: 'Small samples hide everything',
        belief: 'With only ~50 observations, real differences in variability are invisible.',
        truth: 'A 6x difference in SD is visually obvious even at n=50; what small samples blur is small differences, not large ones.',
        watchFor: 'You will see the difference immediately: ask yourself how small the SD gap would need to be before you could no longer see it.',
        source: 'Garfield & Ben-Zvi (2008), reasoning about variability',
    },
    larger_n_more_variable: {
        id: 'larger_n_more_variable',
        label: 'Bigger samples vary more',
        belief: 'Larger samples contain more values, so their means should bounce around more.',
        truth: 'It is the opposite: sample means stabilize as n grows (standard error = SD/sqrt(n)), which is why big studies are trusted more.',
        watchFor: 'Pump the sample size up and watch the sampling distribution narrow, not widen.',
        source: 'Chance, delMas & Garfield (2004), CAOS item family',
    },
    ci_contains_data: {
        id: 'ci_contains_data',
        label: 'CI contains 95% of the data',
        belief: 'A 95% confidence interval is the range that holds 95% of the individual observations.',
        truth: 'The CI is about the MEAN, not the individuals: it is the procedure that captures the true mean in 95% of repeated samples, and it is far narrower than the data spread.',
        watchFor: 'Compare the width of the interval to the spread of the raw points: most individual points fall outside the CI.',
        source: 'Hoekstra et al. (2014); delMas, Garfield & Chance CI studies',
    },
    p_value_h0_prob: {
        id: 'p_value_h0_prob',
        label: 'p = probability H0 is true',
        belief: 'A p-value of .03 means there is a 3% chance the null hypothesis is true.',
        truth: 'The p-value assumes H0 is true and asks how surprising the data would be. It is P(data | H0), never P(H0 | data).',
        watchFor: 'In this simulation H0 is TRUE by construction, yet p dips below .05 about 1 time in 20. The p-value cannot be the probability H0 is true here: that probability is 1.',
        source: 'Wasserstein & Lazar (2016), ASA statement on p-values',
    },
    streak_means_bias: {
        id: 'streak_means_bias',
        label: 'Streaks prove bias',
        belief: 'A run of several heads in a row means the coin must be unfair.',
        truth: 'Fair coins produce streaks constantly: in 100 flips, a streak of 6+ is more likely than not. Evidence of bias is about long-run proportion, not local runs.',
        watchFor: 'Flip a fair coin 100 times and count the longest streak you get by pure chance.',
        source: 'Tversky & Kahneman (1971), belief in the law of small numbers',
    },
    gamblers_fallacy: {
        id: 'gamblers_fallacy',
        label: "Gambler's fallacy",
        belief: 'After several heads, tails is "due" to balance things out.',
        truth: 'The coin has no memory: each flip is 50/50 regardless of history. Proportions settle toward 0.5 by dilution, not by compensation.',
        watchFor: 'After any streak of heads, watch the next 10 flips: they still come out near 50/50, not tails-heavy.',
        source: 'Tversky & Kahneman (1974)',
    },
    significant_means_real: {
        id: 'significant_means_real',
        label: 'Significant = real discovery',
        belief: 'If one test in a batch comes out significant, that effect is real.',
        truth: 'Run 20 tests on pure noise and on average one will be "significant" by chance: that is what alpha = .05 means. Multiple comparisons require correction or replication.',
        watchFor: 'Count how many of the 20 noise-only experiments light up as significant on a typical run.',
        source: 'Simmons, Nelson & Simonsohn (2011), false-positive psychology',
    },
    mean_robust_to_outliers: {
        id: 'mean_robust_to_outliers',
        label: 'The mean resists outliers',
        belief: 'One extreme value cannot move the average much when other values are reasonable.',
        truth: 'The mean is the balance point and one far-out value exerts enormous leverage; the median barely moves. That is why income statistics use medians.',
        watchFor: 'Throw one weight far to the side and watch how far the fulcrum (mean) shifts while the median marker stays put.',
        source: 'delMas, Garfield, Ooms & Chance (2007), CAOS measures of center',
    },
    correlation_is_causation: {
        id: 'correlation_is_causation',
        label: 'Correlation implies causation',
        belief: 'A strong correlation means changing X will change Y.',
        truth: 'Correlation is symmetric and blind to confounders. Only design (randomization, control) licenses causal claims.',
        watchFor: 'Notice the simulation lets you create a strong r with no causal story at all.',
        source: 'GAISE College Report (2016); Holland (1986)',
    },
    signal_needs_big_n_only: {
        id: 'signal_needs_big_n_only',
        label: 'Only sample size matters',
        belief: 'Detecting an effect is just a matter of collecting more data.',
        truth: 'Detectability is a RATIO: signal (effect size) over noise (variability / sqrt(n)). Shrinking noise or growing the effect works exactly like growing n.',
        watchFor: 'Hold n fixed and turn down the noise: the t-value climbs without a single extra observation.',
        source: 'Cohen (1988); GAISE (2016) effect-size emphasis',
    },
};

export const getMisconception = (id: string | null | undefined): Misconception | undefined =>
    id ? MISCONCEPTIONS[id] : undefined;
