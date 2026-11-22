// Aestivation correction: a revise verdict answered by a new version of the plan.
// The previous proposal is never edited. The correction is a new frozen proposal
// with its own digest, linked to the digest it replaces and the review that asked
// for it. The judge who asked for the revision does not apply it.

import { planProposal } from './plan.mjs';
import { verdictRecord } from './verdict.mjs';

export const CORRECTION_REFUSALS = Object.freeze([
  'correction-not-needed', 'review-mismatch', 'reviewer-cannot-apply', 'correction-unchanged',
]);

export class CorrectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CorrectionError';
    this.code = code;
  }
}

/**
 * Correct a plan after review.
 *
 * - `previous` is the frozen proposal that was reviewed.
 * - `verdict` is the review: it must be a `revise` of `previous.id` at `previous.digest`.
 * - `author` applies the correction and may not be the verdict's judge.
 * - `objective` and `steps` default to the previous ones; at least one must change.
 *
 * Returns `{ proposal, correction }`. `proposal` is a new frozen proposal with the same
 * id and a new digest. `correction` records `{ planId, previousDigest, digest,
 * reviewedBy, author, reasons }`. Refusals throw CorrectionError with a code from
 * CORRECTION_REFUSALS; plan shape errors throw PlanError.
 */
export function correctPlan({ previous, verdict, author, objective, steps } = {}) {
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
  const proposal = planProposal({
    id: previous.id,
    objective: objective ?? previous.objective,
    steps: steps ?? previous.steps,
  });
  if (proposal.digest === previous.digest) {
    throw new CorrectionError('correction-unchanged', 'a correction must change the plan');
  }
  const correction = Object.freeze({
    planId: previous.id,
    previousDigest: previous.digest,
    digest: proposal.digest,
    reviewedBy: review.judge,
    author,
    reasons: review.reasons,
  });
  return Object.freeze({ proposal, correction });
}
