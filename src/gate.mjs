// Aestivation gate: one composition, one answer. Valid plan plus approved
// latest verdict permits automatic assembly; anything else holds, with the
// reason named. The gate never ratifies for the owner.

import { latestVerdict } from './verdict.mjs';

export function assemblyGate({ validation, verdicts = [], planId } = {}) {
  if (!validation || typeof validation.ok !== 'boolean') {
    throw new Error('assemblyGate requires a validation result with a boolean ok');
  }
  if (typeof planId !== 'string' || planId.length === 0) {
    throw new Error('assemblyGate requires a non-empty planId');
  }
  const verdict = latestVerdict(verdicts, planId);

  // Order is the doctrine: deterministic outranks judgment.
  let held = null;
  if (!validation.ok) {
    held = 'plan-invalid';
  } else if (verdict === null) {
    held = 'awaiting-verdict';
  } else if (verdict.decision === 'revise') {
    held = 'revisions-requested';
  }

  return {
    permitted: held === null,
    held,
    validation,
    verdict,
  };
}
