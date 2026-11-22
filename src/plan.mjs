// Aestivation plan: proposals and the deterministic rule pack.
// The rule pack judges shape and order — never content, never authority.

export const STAGE_KINDS = Object.freeze(
  new Set(['research', 'work', 'review', 'assemble', 'verify'])
);

export class PlanError extends Error {
  constructor(issues) {
    super(`invalid plan proposal: ${issues.join('; ')}`);
    this.name = 'PlanError';
    this.issues = issues;
  }
}

function validateSteps(steps) {
  const issues = [];
  if (!Array.isArray(steps) || steps.length === 0) {
    issues.push('a plan needs at least one step');
    return issues;
  }
  steps.forEach((step, index) => {
    if (!step || typeof step !== 'object') {
      issues.push(`step ${index} must be an object`);
      return;
    }
    if (!STAGE_KINDS.has(step.stage)) {
      issues.push(
        `step ${index} names unknown stage ${JSON.stringify(step.stage)} (known: ${[...STAGE_KINDS].join(', ')})`
      );
    }
    if (typeof step.title !== 'string' || step.title.length === 0) {
      issues.push(`step ${index} must have a non-empty title`);
    }
  });
  const indexes = (kind) =>
    steps.map((step, index) => (step && step.stage === kind ? index : -1)).filter((i) => i >= 0);
  const firstReview = indexes('review')[0];
  const firstAssemble = indexes('assemble')[0];
  if (firstReview !== undefined && firstAssemble !== undefined && firstReview > firstAssemble) {
    issues.push('review must precede the first assemble step');
  }
  const verifySteps = indexes('verify');
  const lastIndex = steps.length - 1;
  if (verifySteps.length > 0 && verifySteps[verifySteps.length - 1] !== lastIndex) {
    issues.push('verify must be the final step when present');
  }
  return issues;
}

export function validatePlan(steps) {
  const issues = validateSteps(steps);
  return { ok: issues.length === 0, errors: issues };
}

export function planProposal({ id, objective, steps } = {}) {
  const issues = [];
  if (typeof id !== 'string' || id.length === 0) issues.push('id must be a non-empty string');
  if (typeof objective !== 'string' || objective.length === 0) {
    issues.push('objective must be a non-empty string');
  }
  issues.push(...validateSteps(steps));
  if (issues.length > 0) throw new PlanError(issues);
  return Object.freeze({
    id,
    objective,
    steps: Object.freeze(steps.map((step) => Object.freeze({ ...step }))),
  });
}
