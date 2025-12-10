
import { GoogleGenAI } from "@google/genai";
import { Observation, ValueTimePoint, FrequentPattern, LagAnalysisResult, StudentAction, FactorLoading, SNANode, BKTParams, FitIndices, SEMPath, PredictionResult, Bookmark, IRTParams, Topic, QualitativeTheme, Participant } from '../types';

// Ensure the API_KEY is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

const callGemini = async (prompt: string, retries = 3, delay = 1000): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No explanation generated.";
    } catch (error: any) {
        // Analyze the error object for rate limiting indicators
        const isRateLimit = 
            error?.status === 429 || 
            error?.status === 'RESOURCE_EXHAUSTED' ||
            (error?.message && error.message.includes('RESOURCE_EXHAUSTED')) ||
            (error?.error?.code === 429) ||
            (error?.error?.status === 'RESOURCE_EXHAUSTED');

        if (isRateLimit && retries > 0) {
            console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGemini(prompt, retries - 1, delay * 2);
        }

        console.error("Error fetching explanation from Gemini:", error);
        
        if (isRateLimit) {
            return "API rate limit exceeded. Please wait a moment before trying again.";
        } else if (error instanceof Error) {
            return `An error occurred: ${error.message}`;
        }
        
        return "Failed to generate an explanation. Please try again shortly.";
    }
};

export const getChatResponse = async (userMessage: string, context: string): Promise<string> => {
    const prompt = `
    Context: ${context}
    
    User Question: ${userMessage}
    
    Respond as the persona defined in the context. Keep the answer concise (under 2 sentences) and educational.
    `;
    return callGemini(prompt);
};


export const getCorrelationExplanation = (correlation: number) => {
    const prompt = `The correlation coefficient between two variables is ${correlation.toFixed(3)}. Explain this relationship in one simple sentence, using an analogy a beginner would understand.`;
    return callGemini(prompt);
};

export const getRegressionExplanation = (rSquared: number, hasOutlier: boolean) => {
    let prompt: string;
    if (hasOutlier && rSquared < 0.6) {
        prompt = `The R-squared value of a linear regression model has dropped to ${rSquared.toFixed(2)} because of an outlier. In one creative and simple sentence, explain how a single data point can ruin the model's fit, using an analogy like "a spy on a soccer team."`;
    } else if (rSquared > 0.85) {
        prompt = `The R-squared value of a linear regression model is ${rSquared.toFixed(2)}. In one simple sentence, explain what this high value means about the relationship between the variables, using an analogy.`;
    } else {
        prompt = `The R-squared value of a linear regression model is ${rSquared.toFixed(2)}. In one simple sentence, explain what this value represents.`;
    }
    return callGemini(prompt);
};

export const getPValueExplanation = (pValue: number) => {
    const prompt = `The p-value from a Z-test is ${pValue.toExponential(2)}. In one simple sentence, explain what this p-value suggests about the difference between the two groups, using an analogy a beginner would understand.`;
    return callGemini(prompt);
};

export const getAnovaPValueExplanation = (pValue: number, numGroups: number) => {
    const prompt = `The p-value from an ANOVA test comparing ${numGroups} groups is ${pValue.toExponential(2)}. In one simple sentence, explain what this p-value suggests about the differences between the group means, using an analogy a beginner would understand.`;
    return callGemini(prompt);
};

export const getBayesianExplanation = (priorAlpha: number, priorBeta: number, heads: number, tails: number) => {
    const priorHeads = Math.max(0, priorAlpha - 1).toFixed(1);
    const priorTails = Math.max(0, priorBeta - 1).toFixed(1);
    const prompt = `Explain Bayesian inference simply. My prior belief about a coin was like having seen ${priorHeads} heads and ${priorTails} tails. I then observed ${heads} new head(s) and ${tails} new tail(s). In one simple sentence, explain how this new evidence updated my belief, using an analogy.`;
    return callGemini(prompt);
};

export const getHMMExplanation = (transitionProbs: { sunnyToSunny: number, rainyToRainy: number }, observations: Observation[]) => {
    const sunnyToSunnyPercent = (transitionProbs.sunnyToSunny * 100).toFixed(0);
    const rainyToRainyPercent = (transitionProbs.rainyToRainy * 100).toFixed(0);
    const obsString = observations.join(', ');
    const prompt = `A Hidden Markov Model has these weather rules: A sunny day has a ${sunnyToSunnyPercent}% chance of being followed by another sunny day. A rainy day has a ${rainyToRainyPercent}% chance of being followed by another rainy day. People tend to 'Walk' on sunny days and 'Read' or 'Clean' on rainy days. The model generated this sequence of activities: [${obsString}]. In one simple sentence, explain why this pattern of activities makes sense given the weather transition rules.`;
    return callGemini(prompt);
};

export const getMultiLevelExplanation = (fixedSlope: number, interceptVariance: number, slopeVariance: number) => {
    const describeVariance = (variance: number, highThreshold: number, mediumThreshold: number): string => {
        if (variance > highThreshold) return 'high';
        if (variance > mediumThreshold) return 'medium';
        return 'low';
    }
    const interceptVarDesc = describeVariance(interceptVariance, 150, 50);
    const slopeVarDesc = describeVariance(slopeVariance, 0.5, 0.1);
    const prompt = `Explain a multi-level model scenario. The general relationship is that for every one unit increase in an input, the output changes by ${fixedSlope.toFixed(2)}. The variability between groups' starting points (intercepts) is ${interceptVarDesc}. The variability in how the input affects the output for each group (slopes) is ${slopeVarDesc}. In one simple sentence, explain what this means using an analogy of students' test scores (output) vs. hours studied (input) across different schools (groups).`;
    return callGemini(prompt);
};

export const getConfidenceIntervalExplanation = (confidenceLevel: number) => {
    const prompt = `In one simple sentence, explain what a ${confidenceLevel}% confidence level means, using an analogy about repeating an experiment 100 times to reassure a beginner.`;
    return callGemini(prompt);
};

export const getChiSquareExplanation = (pValue: number) => {
    const prompt = `The p-value from a Chi-Square test is ${pValue.toExponential(2)}. In one simple sentence, explain what this suggests about the relationship between the two categorical variables.`;
    return callGemini(prompt);
};

export const getIndependenceExplanation = () => {
    const prompt = `In the context of a Chi-Square test, explain what "statistical independence" means in one simple sentence, using an analogy like "drinking coffee today and it raining tomorrow".`;
    return callGemini(prompt);
};

export const getLogisticRegressionExplanation = (xValue: number, probability: number, varName: string, outcomeName: string) => {
    const prompt = `In a logistic regression model, a data point with a "${varName}" of ${xValue.toFixed(1)} has a predicted probability of ${Math.round(probability * 100)}% for the outcome "${outcomeName}". Explain this prediction in one simple, encouraging sentence.`;
    return callGemini(prompt);
};

export const getDecisionTreeNodeExplanation = (featureIndex: number, threshold: number) => {
    const featureName = featureIndex === 0 ? 'the horizontal position (X)' : 'the vertical position (Y)';
    const prompt = `A decision tree node is splitting data based on a rule: is ${featureName} less than ${threshold.toFixed(1)}? In one simple sentence, explain what this split is trying to achieve.`;
    return callGemini(prompt);
};

export const getKMeansExplanation = (k: number, inertia: number) => {
    const inertiaDesc = inertia < 50000 ? "tightly packed" : "spread out";
    const prompt = `A K-Means algorithm with K=${k} has finished, and the resulting clusters are ${inertiaDesc}. In one simple sentence, provide feedback on whether K=${k} seems like a good fit for the data based on this observation.`;
    return callGemini(prompt);
};

export const getPCAExplanation = () => {
    const prompt = `In one simple sentence, explain what Principal Component Analysis (PCA) is used for, using an analogy like "finding the best angle to take a group photo" or "summarizing a long book".`;
    return callGemini(prompt);
};

export const getLPAExplanation = (numProfiles: number) => {
    const prompt = `Latent Profile Analysis (LPA) was used and it identified ${numProfiles} distinct subgroups in the data. In one simple sentence, explain what finding these groups means using an analogy of different types of students in a classroom.`;
    return callGemini(prompt);
};

export const getTimeSeriesExplanation = (data: number[]) => {
    const dataString = data.map(d => d.toFixed(1)).join(', ');
    const prompt = `This time-series data shows a pattern over time: [${dataString}]. In one simple sentence, identify a potential pattern (like a trend or a cycle) and suggest what it might represent using a fun, real-world analogy.`;
    return callGemini(prompt);
};

export const getSPMExplanation = (patternsGroupA: FrequentPattern[], patternsGroupB: FrequentPattern[]) => {
    const formatPatterns = (patterns: FrequentPattern[]) => patterns.slice(0, 3).map(p => `(${p.pattern.join(' → ')})`).join(', ');
    const prompt = `I'm analyzing student behavior. Group A are high-achievers. Group B are low-achievers.
    - Group A's top patterns: ${formatPatterns(patternsGroupA)}
    - Group B's top patterns: ${formatPatterns(patternsGroupB)}
    (Action key: V=Video, Q=Quiz, P=Pass, E=Fail, F=Forum, A=Assignment).
    In one simple sentence, compare the behavioral differences revealed by these patterns.`;
    return callGemini(prompt);
};

const findSignificantTransition = (result: LagAnalysisResult): string => {
    let maxZ = 0;
    let transition = 'None';
    for (const from in result.zScores) {
        for (const to in result.zScores[from]) {
            if (result.zScores[from][to] > maxZ) {
                maxZ = result.zScores[from][to];
                transition = `${from} → ${to}`;
            }
        }
    }
    return transition;
}

export const getLSAExplanation = (resultA: LagAnalysisResult, resultB: LagAnalysisResult) => {
    const transitionA = findSignificantTransition(resultA);
    const transitionB = findSignificantTransition(resultB);
    const prompt = `I'm analyzing student behavior with lag-sequential analysis.
    - Group A (high-achievers) most significant transition is: ${transitionA}.
    - Group B (low-achievers) most significant transition is: ${transitionB}.
    (Action key: V=Video, Q=Quiz, P=Pass, E=Fail, F=Forum, A=Assignment).
    In one simple sentence, what might this difference in behavior signify?`;
    return callGemini(prompt);
}

export const getFactorAnalysisExplanation = (loadings: FactorLoading[], explainedVariance: number[]) => {
    let prompt = `I performed a factor analysis.
The analysis extracted ${loadings[0] ? Object.keys(loadings[0]).length - 1 : 0} factors.`;
    
    for (let i = 0; i < explainedVariance.length; i++) {
        const factorName = `Factor ${i + 1}`;
        prompt += `\n- ${factorName} explains ${(explainedVariance[i] * 100).toFixed(1)}% of the variance.`;
        const highLoadings = loadings
            .filter(l => Math.abs(l[`factor${i + 1}`] as number) > 0.5)
            .map(l => `'${l.item}' (${(l[`factor${i + 1}`] as number).toFixed(2)})`);
        if (highLoadings.length > 0) {
             prompt += ` Items that load highly on it are: ${highLoadings.join(', ')}.`;
        }
    }
    
    prompt += `\n(Item IDs: ext=extraversion, con=conscientiousness, neu=neuroticism). Based on the item groupings, give each factor a meaningful name and provide a one-sentence summary of what this factor structure tells us about the data.`;
    
    return callGemini(prompt);
};

export const getSNAExplanation = (nodes: SNANode[]) => {
    if (nodes.length === 0) return callGemini("Explain what an empty social network graph means in one simple sentence.");

    let mostCentralNode = nodes[0];
    let isolatedNodes = [];
    for (const node of nodes) {
        if (node.degree > mostCentralNode.degree) {
            mostCentralNode = node;
        }
        if (node.degree <= 1) { // Degree of 1 might still be isolated in a large network
            isolatedNodes.push(node.id);
        }
    }

    let prompt = `I'm looking at a social network of students. `;
    if (mostCentralNode) {
        prompt += `Student ${mostCentralNode.id} is the most connected with ${mostCentralNode.degree} connections. `;
    }
    if (isolatedNodes.length > 0) {
        prompt += `Student(s) ${isolatedNodes.join(', ')} seem to be isolated. `;
    }
    prompt += `In one simple sentence, explain what this network structure might mean in a collaborative learning environment.`;
    
    return callGemini(prompt);
};

export const getKnowledgeTracingExplanation = (masteryBefore: number, masteryAfter: number, isCorrect: boolean, params: BKTParams) => {
    const { learn, guess, slip } = params;
    const masteryChange = masteryAfter - masteryBefore;
    const answerType = isCorrect ? 'correct' : 'incorrect';

    let context = '';
    if (isCorrect && masteryChange < 0.05 && guess > 0.3) {
        context = `The model thinks there's a high chance the student just guessed correctly (guess rate is high).`;
    } else if (!isCorrect && masteryChange > -0.05 && slip > 0.3) {
        context = `The model thinks the student likely knew the answer but made a mistake (slip rate is high).`;
    } else if (masteryChange > learn * 0.8) {
        context = `This was a great learning opportunity.`;
    } else {
        context = `This answer reinforced the model's current belief.`;
    }

    const prompt = `A student's estimated knowledge mastery went from ${Math.round(masteryBefore * 100)}% to ${Math.round(masteryAfter * 100)}% after giving a ${answerType} answer. The model's "learn" rate is ${learn.toFixed(2)}, "guess" rate is ${guess.toFixed(2)}, and "slip" rate is ${slip.toFixed(2)}. Context: ${context} In one simple, encouraging sentence, explain this change to a student or teacher.`;
    return callGemini(prompt);
};

export const getSurvivalAnalysisExplanation = (medianA: string, medianB: string) => {
    const prompt = `In a survival analysis, Group A (who received mentoring) had a median survival time of ${medianA} weeks. Group B (the control group) had a median survival time of ${medianB} weeks. "Survival" here means not dropping out of the course. In one simple sentence, explain what this result suggests about the mentoring program.`;
    return callGemini(prompt);
};

export const getSEMExplanation = (currentFit: FitIndices, prevFit: FitIndices | null, changedPath: SEMPath, varLabels: Record<string, string>) => {
    const action = changedPath.specified ? 'Adding' : 'Removing';
    const pathType = changedPath.type === 'covariance' ? 'covariance between' : 'path from';
    const fromLabel = varLabels[changedPath.from];
    const toLabel = varLabels[changedPath.to];

    let fitChangeDesc = '';
    if (prevFit) {
        const cfiChange = currentFit.cfi - prevFit.cfi;
        const rmseaChange = currentFit.rmsea - prevFit.rmsea;
        if (cfiChange > 0.01 && rmseaChange < -0.01) {
            fitChangeDesc = "This significantly improved the model's fit.";
        } else if (cfiChange < -0.01 && rmseaChange > 0.01) {
            fitChangeDesc = "This significantly worsened the model's fit.";
        } else {
            fitChangeDesc = "This did not substantially change the model's fit.";
        }
    }
    
    const prompt = `I am building a Structural Equation Model. I just performed this action: ${action} the ${pathType} "${fromLabel}" to "${toLabel}". The model fit has changed. ${fitChangeDesc} The new CFI is ${currentFit.cfi.toFixed(3)} and RMSEA is ${currentFit.rmsea.toFixed(3)}. In one simple sentence, explain what this action and the resulting fit tell me about my theory.`;

    return callGemini(prompt);
};

export const getPSMExplanation = (isMatched: boolean, selectionBias: number) => {
    if (isMatched) {
        const prompt = `After performing Propensity Score Matching, the Treatment and Control groups are now balanced on their prior scores. In one simple sentence, explain why this is a crucial step for making a fair comparison between the two groups.`;
        return callGemini(prompt);
    } else {
         const prompt = `The Treatment group has an average prior score that is ${selectionBias.toFixed(0)} points higher than the Control group due to selection bias. In one simple sentence, explain why simply comparing the outcomes of these two groups would be misleading, using an analogy like a "race where one runner starts halfway to the finish line."`;
         return callGemini(prompt);
    }
};

export const getXAIExplanation = (result: PredictionResult) => {
    const topPositive = result.contributions.filter(c => c.value > 0).sort((a, b) => b.value - a.value)[0];
    const topNegative = result.contributions.filter(c => c.value < 0).sort((a, b) => a.value - b.value)[0];
    
    let prompt = `An AI model predicts a student's success probability is ${result.prediction.toFixed(0)}%.`;
    if (topPositive) {
        prompt += ` The biggest positive factor was "${topPositive.feature}".`;
    }
    if (topNegative) {
        prompt += ` The biggest negative factor was "${topNegative.feature}".`;
    }
    prompt += ` In one simple, encouraging sentence, summarize this prediction for a teacher.`;
    return callGemini(prompt);
};

export const getMultimodalEventExplanation = (bookmark: Bookmark) => {
    const prompt = `I'm analyzing multimodal data from two students collaborating. A significant event was automatically bookmarked at ${bookmark.time.toFixed(1)}s, described as "${bookmark.description}". In one simple sentence, explain what this specific type of event might indicate about the students' collaboration process.`;
    return callGemini(prompt);
};

export const getIrtExplanation = (params: IRTParams) => {
    const { discrimination, difficulty } = params;
    let diffDesc = "average";
    if (difficulty > 1.5) diffDesc = "very high";
    else if (difficulty > 0.5) diffDesc = "high";
    else if (difficulty < -1.5) diffDesc = "very low";
    else if (difficulty < -0.5) diffDesc = "low";

    let discDesc = "average";
    if (discrimination > 3) discDesc = "very high";
    else if (discrimination > 1.5) discDesc = "high";
    else if (discrimination < 0.5) discDesc = "low";

    const prompt = `I'm looking at an item from a test. It has a difficulty level of ${difficulty.toFixed(2)} (which is ${diffDesc}) and a discrimination of ${discrimination.toFixed(2)} (which is ${discDesc}). In one simple sentence, explain what kind of question this is and which students it would be most useful for assessing.`;
    return callGemini(prompt);
};

export const getTopicModelingExplanation = (topics: Topic[]) => {
    let prompt = `I have discovered several topics from a collection of student essays using LDA. For each topic, I will provide the top keywords. Please provide a short, descriptive name for each topic based on its keywords.

Format your response as a numbered list, like this:
1. Topic Name 1
2. Topic Name 2

Here are the topics:
`;
    topics.forEach((topic, i) => {
        const keywords = topic.keywords.map(kw => kw.text).join(', ');
        prompt += `${i + 1}: ${keywords}\n`;
    });
    
    return callGemini(prompt);
};

export const getMixedMethodsInsight = (theme: QualitativeTheme, subgroup: Participant[], population: Participant[]) => {
    if (subgroup.length === 0) {
        return "No participants mentioned this theme.";
    }
    const subgroupAvg = subgroup.reduce((sum, p) => sum + p.score, 0) / subgroup.length;
    const populationAvg = population.reduce((sum, p) => sum + p.score, 0) / population.length;
    const comparison = subgroupAvg < populationAvg ? 'lower' : 'higher';

    const prompt = `I'm doing a mixed methods analysis. I found a qualitative theme: "${theme.text}". The ${subgroup.length} participants who mentioned this theme had an average quantitative score of ${subgroupAvg.toFixed(1)}. This is ${comparison} than the overall average of ${populationAvg.toFixed(1)}. In one simple sentence, explain what this connection between the qualitative theme and the quantitative scores suggests.`;
    return callGemini(prompt);
};

export const getRddExplanation = (effect: number, cutoff: number) => {
    const effectDesc = Math.abs(effect) < 5 ? 'a negligible' : (effect > 0 ? 'a positive' : 'a negative');
    const prompt = `A Regression Discontinuity Design analysis shows an estimated effect size of ${effect.toFixed(2)} at the cutoff point of ${cutoff.toFixed(1)}. In one simple sentence, explain what this ${effectDesc} effect suggests about the intervention given to those who scored above the cutoff. Use an analogy like "a jump in performance".`;
    return callGemini(prompt);
};
