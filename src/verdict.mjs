// Aestivation verdicts: recorded review, append-only, reasons attached.
// A verdict is a record of a moment in review. It is never edited.

export const DECISIONS = Object.freeze(new Set(['approve', 'revise']));

export class VerdictError extends Error {
  constructor(issues) {
    super(`invalid verdict: ${issues.join('; ')}`);
    this.name = 'VerdictError';
    this.issues = issues;
  }
}

export function verdictRecord({ planId, decision, judge, reasons = [] } = {}) {
  const issues = [];
  if (typeof planId !== 'string' || planId.length === 0) issues.push('planId must be a non-empty string');
  if (!DECISIONS.has(decision)) {
    issues.push(`decision must be one of ${[...DECISIONS].join(', ')} (got ${JSON.stringify(decision)})`);
  }
  if (typeof judge !== 'string' || judge.length === 0) issues.push('judge must be a non-empty string');
  if (!Array.isArray(reasons) || reasons.some((r) => typeof r !== 'string' || r.length === 0)) {
    issues.push('reasons must be a list of non-empty strings');
  }
  if (decision === 'revise' && Array.isArray(reasons) && reasons.length === 0) {
    issues.push('a revise verdict requires at least one reason');
  }
  if (issues.length > 0) throw new VerdictError(issues);
  return Object.freeze({ planId, decision, judge, reasons: Object.freeze([...reasons]) });
}

export function isSoundVerdictLedger(verdicts, knownPlanIds) {
  const known = knownPlanIds instanceof Set ? knownPlanIds : new Set(knownPlanIds);
  const errors = [];
  verdicts.forEach((verdict, index) => {
    if (!known.has(verdict.planId)) {
      errors.push(`verdict ${index} references unknown plan ${JSON.stringify(verdict.planId)}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function latestVerdict(verdicts, planId) {
  const forPlan = verdicts.filter((v) => v.planId === planId);
  return forPlan.length > 0 ? forPlan[forPlan.length - 1] : null;
}
