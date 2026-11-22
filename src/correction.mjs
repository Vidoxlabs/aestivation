// Aestivation correction: a revise verdict answered by a new version of the plan.
// The previous proposal is never edited. The correction is a new frozen proposal
// with its own digest, linked to the digest it replaces and the review that asked
// for it. The judge who asked for the revision does not apply it.

import { planProposal } from './plan.mjs';
import { verdictRecord } from './verdict.mjs';

export const CORRECTION_REFUSALS = Object.freeze([
  'correction-not-needed', 'review-mismatch', 'reviewer-cannot-apply', 'correction-unchanged',
  'order-superseded', 'replan-exhausted', 'result-mismatch',
]);

const MAX_REPLANS = 2;
// Each proposal instance in a run refers to the same correction history.
const LINEAGES = new WeakMap();

export class CorrectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CorrectionError';
    this.code = code;
  }
}

export class ScopeExpansionError extends CorrectionError {
  constructor() {
    super('authority-required', 'a correction that expands scope requires separate authority');
    this.name = 'ScopeExpansionError';
  }
}

/** Check a result against the proposal held by the run before consuming it. */
export function assertCurrentPlanResult(proposal, result) {
  const { planId, planDigest } = result ?? {};
  if (typeof proposal?.id !== 'string' || typeof proposal.digest !== 'string' || planId !== proposal.id) {
    throw new CorrectionError('result-mismatch', 'the result must name the active plan and its digest');
  }
  const lineage = LINEAGES.get(proposal);
  if (lineage && (lineage.activeDigest !== proposal.digest || lineage.retiredDigests.has(planDigest))) {
    throw new CorrectionError('order-superseded', 'a superseded proposal cannot accept results');
  }
  if (planDigest !== proposal.digest) {
    throw new CorrectionError('result-mismatch', 'the result must name the active plan and its digest');
  }
}

/**
 * Correct a plan after review.
 *
 * - `previous` is the frozen proposal that was reviewed.
 * - `verdict` is the review: it must be a `revise` of `previous.id` at `previous.digest`.
 * - `author` applies the correction and may not be the verdict's judge.
 * - `objective` and `steps` default to the previous ones; at least one must change.
 * - A declared scope expansion throws ScopeExpansionError before minting a new proposal.
 *
 * Returns `{ proposal, correction }`. `proposal` is a new frozen proposal with the same
 * id and a new digest. `correction` records `{ planId, previousDigest, digest,
 * reviewedBy, author, reasons }`. Review and lineage refusals use CORRECTION_REFUSALS.
 * Plan shape errors throw PlanError.
 */
export function correctPlan({
  previous, verdict, author, objective, steps,
  scopeExpanding = false, expandWorkspace = null, expandPaths = null, newCriterionGrant = false,
} = {}) {
  if (!previous || typeof previous !== 'object' || typeof previous.digest !== 'string') {
    throw new CorrectionError('review-mismatch', 'a correction needs the reviewed proposal');
  }
  const review = verdictRecord(verdict ?? {});
  if (review.decision !== 'revise') {
    throw new CorrectionError('correction-not-needed', 'an approved plan has no correction to apply');
  }
  if (review.planId !== previous.id || review.planDigest !== previous.digest) {
    throw new CorrectionError('review-mismatch', 'the verdict did not review this version of the plan');
  }
  if (typeof author !== 'string' || author.length === 0) {
    throw new CorrectionError('reviewer-cannot-apply', 'a correction names the author who applies it');
  }
  if (author === review.judge) {
    throw new CorrectionError('reviewer-cannot-apply', 'the judge who asked for the revision cannot apply it');
  }
  if (scopeExpanding || expandWorkspace !== null || expandPaths !== null || newCriterionGrant) {
    throw new ScopeExpansionError();
  }
  const proposal = planProposal({
    id: previous.id,
    objective: objective ?? previous.objective,
    steps: steps ?? previous.steps,
  });
  assertCurrentPlanResult(previous, review);
  const lineage = LINEAGES.get(previous) ?? { activeDigest: previous.digest, retiredDigests: new Set() };
  if (lineage.retiredDigests.size >= MAX_REPLANS) {
    throw new CorrectionError('replan-exhausted', 'the parent plan has spent its two replans');
  }
  if (proposal.digest === previous.digest) {
    throw new CorrectionError('correction-unchanged', 'a correction must change the plan');
  }
  if (lineage.retiredDigests.has(proposal.digest)) {
    throw new CorrectionError('order-superseded', 'a correction cannot restore a superseded digest');
  }
  const correction = Object.freeze({
    planId: previous.id,
    previousDigest: previous.digest,
    digest: proposal.digest,
    reviewedBy: review.judge,
    author,
    reasons: review.reasons,
  });
  lineage.retiredDigests.add(previous.digest);
  lineage.activeDigest = proposal.digest;
  LINEAGES.set(previous, lineage);
  LINEAGES.set(proposal, lineage);
  return Object.freeze({ proposal, correction });
}
