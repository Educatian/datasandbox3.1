// Transparent adaptive recommendation: runs REAL Bayesian Knowledge Tracing
// (the same updateMastery the Knowledge Tracer module teaches) over the
// learner's own prediction/mission telemetry, and explains itself.
// "The app practices the statistics it teaches."

import { updateMastery } from './statisticsService';
import { getConcept } from './loggingService';
import { ALL_TRACKS, getModuleDef } from '../curriculum';

export interface ConceptMastery {
    concept: string;
    mastery: number;
    observations: number;
}

export interface AdaptiveRecommendation {
    module: { id: string; title: string };
    concept: string;
    mastery: number | null;
    reason: string;
    masteries: ConceptMastery[];
    params: { prior: number; learn: number; guess: number; slip: number };
}

// Standard BKT parameters (Corbett & Anderson 1995 ballpark); shown to the
// learner, not hidden.
const BKT = { prior: 0.3, learn: 0.2, guess: 0.25, slip: 0.1 };

interface EvidenceRow {
    page: string;
    target_id: string;
    target_tag: string;
    target_class: string;
    timestamp: string;
}

const safeJson = (s: string): any => {
    try { return JSON.parse(s); } catch { return null; }
};

/**
 * Compute per-concept BKT masteries from raw telemetry rows
 * (prediction_commit correctness + mission completions as observations),
 * then recommend the visible module whose concept has the lowest mastery.
 */
export const computeRecommendation = (
    rows: EvidenceRow[],
    isModuleVisible: (id: string) => boolean,
    exploredIds: Set<string>
): AdaptiveRecommendation | null => {
    // Chronological order matters for BKT
    const evidence = [...rows]
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map(r => {
            if (r.target_tag === 'PredictGate' && r.target_id === 'prediction_commit') {
                const d = safeJson(r.target_class);
                if (d && (d.correct === true || d.correct === false)) {
                    return { concept: getConcept(r.page), correct: d.correct as boolean };
                }
            }
            if (r.target_id === 'mission_complete') {
                return { concept: getConcept(r.target_tag), correct: true };
            }
            return null;
        })
        .filter((e): e is { concept: string; correct: boolean } => !!e && e.concept !== 'Unknown');

    const mastery: Record<string, { p: number; n: number }> = {};
    for (const e of evidence) {
        const cur = mastery[e.concept] ?? { p: BKT.prior, n: 0 };
        cur.p = updateMastery(cur.p, e.correct, { learn: BKT.learn, guess: BKT.guess, slip: BKT.slip });
        cur.n += 1;
        mastery[e.concept] = cur;
    }

    const masteries: ConceptMastery[] = Object.entries(mastery)
        .map(([concept, m]) => ({ concept, mastery: m.p, observations: m.n }))
        .sort((a, b) => a.mastery - b.mastery);

    // Candidate modules: visible, with a known concept
    const candidates = ALL_TRACKS.flatMap(t => t.modules).filter(m => isModuleVisible(m.id));
    if (candidates.length === 0) return null;

    // 1st choice: lowest-mastery concept with a matching module (reinforce weakness)
    for (const cm of masteries) {
        if (cm.mastery >= 0.85) break; // everything tracked is mastered
        const match = candidates.find(m => getConcept(m.id) === cm.concept);
        if (match) {
            return {
                module: { id: match.id, title: match.title },
                concept: cm.concept,
                mastery: cm.mastery,
                reason: `Your estimated mastery of ${cm.concept} is ${(cm.mastery * 100).toFixed(0)}% after ${cm.observations} observation${cm.observations === 1 ? '' : 's'}, your lowest tracked concept, so the model suggests reinforcing it.`,
                masteries,
                params: BKT,
            };
        }
    }

    // 2nd choice: first visible module with no evidence at all (explore new ground)
    const fresh = candidates.find(m => !exploredIds.has(m.id) && !mastery[getConcept(m.id)]);
    if (fresh) {
        return {
            module: { id: fresh.id, title: fresh.title },
            concept: getConcept(fresh.id),
            mastery: null,
            reason: `No evidence yet about ${getConcept(fresh.id)}: the model has nothing to update on, so the highest-information move is to explore it.`,
            masteries,
            params: BKT,
        };
    }

    const anyModule = candidates.find(m => !exploredIds.has(m.id)) || candidates[0];
    const def = getModuleDef(anyModule.id);
    return {
        module: { id: anyModule.id, title: def?.title || anyModule.id },
        concept: getConcept(anyModule.id),
        mastery: mastery[getConcept(anyModule.id)]?.p ?? null,
        reason: 'All tracked concepts look strong; keep exploring.',
        masteries,
        params: BKT,
    };
};
