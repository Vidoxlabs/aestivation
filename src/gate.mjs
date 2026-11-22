// Aestivation gate: one composition, one answer. Valid plan plus approved
// latest verdict permits automatic assembly; anything else holds, with the
// reason named. The gate never ratifies for the owner.

import { latestVerdict, ledgerSoundness } from './verdict.mjs';

// Held reasons, in the order the gate checks them.
export const HELD_REASONS = Object.freeze([
  'plan-invalid', 'ledger-unsound', 'awaiting-verdict', 'revisions-requested',
]);

export function assemblyGate({ validation, verdicts = [], planId, knownPlanIds } = {}) {
  if (!validation || typeof validation.ok !== 'boolean') {
    throw new Error('assemblyGate requires a validation result with a boolean ok');
  }
  if (typeof planId !== 'string' || planId.length === 0) {
    throw new Error('assemblyGate requires a non-empty planId');
  }
  const known = knownPlanIds === undefined
    ? null
    : (knownPlanIds instanceof Set ? knownPlanIds : new Set(knownPlanIds));
  const ledger = ledgerSoundness(verdicts, known);
  if (known !== null && !known.has(planId)) {
    ledger.errors.unshift(`plan ${JSON.stringify(planId)} is not a known plan`);
    ledger.ok = false;
  }
  // A verdict from a ledger the gate cannot trust is never surfaced as the answer.
  const verdict = ledger.ok ? latestVerdict(verdicts, planId) : null;

  // Order is the doctrine: deterministic outranks judgment, and judgment
  // counts only from a ledger the gate can trust.
  let held = null;
  if (!validation.ok) {
    held = 'plan-invalid';
  } else if (!ledger.ok) {
    held = 'ledger-unsound';
  } else if (verdict === null) {
    held = 'awaiting-verdict';
  } else if (verdict.decision === 'revise') {
    held = 'revisions-requested';
  }

  return {
    permitted: held === null,
    held,
    validation,
    ledger: Object.freeze({ ok: ledger.ok, errors: Object.freeze([...ledger.errors]) }),
    verdict,
  };
}
