// Aestivation plan: proposals and the deterministic rule pack.
// The rule pack judges shape and order — never content, never authority.

import { createHash } from 'node:crypto';

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

// Canonical JSON: object keys sorted, undefined members dropped, no whitespace.
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const members = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${members.join(',')}}`;
  }
  return JSON.stringify(value);
}

// The SHA-256 of a proposal's content: its id, objective, and every field of
// every step, as canonical JSON. A verdict names this digest to say exactly
// which version of the plan it reviewed.
export function planDigest({ id, objective, steps } = {}) {
  if (typeof id !== 'string' || typeof objective !== 'string' || !Array.isArray(steps)) {
    throw new PlanError(['planDigest needs a proposal with an id, an objective, and steps']);
  }
  return createHash('sha256').update(canonicalJson({ id, objective, steps }), 'utf8').digest('hex');
}

export function planProposal({ id, objective, steps } = {}) {
  const issues = [];
  if (typeof id !== 'string' || id.length === 0) issues.push('id must be a non-empty string');
  if (typeof objective !== 'string' || objective.length === 0) {
    issues.push('objective must be a non-empty string');
  }
  issues.push(...validateSteps(steps));
  if (issues.length > 0) throw new PlanError(issues);
  const frozenSteps = Object.freeze(steps.map((step) => Object.freeze({ ...step })));
  return Object.freeze({
    id,
    objective,
    steps: frozenSteps,
    digest: planDigest({ id, objective, steps: frozenSteps }),
  });
}
