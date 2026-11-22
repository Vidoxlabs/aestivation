import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCurrentPlanResult, CorrectionError, ScopeExpansionError, correctPlan, planProposal, verdictRecord,
} from '../src/index.mjs';

function correctionFor(previous, objective, scope = {}) {
  const verdict = verdictRecord({
    planId: previous.id, planDigest: previous.digest, decision: 'revise',
    judge: 'reviewer', reasons: ['clarify the deliverable'],
  });
  return correctPlan({ previous, verdict, author: 'implementer', objective, ...scope }).proposal;
}

test('a scope-expanding correction leaves the previous proposal current and spends no replan', () => {
  const previous = planProposal({ id: 'plan-1', objective: 'Draft the guide.', steps: [{ stage: 'work', title: 'Draft' }] });
  const snapshot = JSON.stringify(previous);
  for (const scope of [
    { scopeExpanding: true },
    { expandWorkspace: 'another-workspace' },
    { expandPaths: ['additional-sources'] },
    { expandPaths: [] },
    { newCriterionGrant: true },
  ]) {
    assert.throws(() => correctionFor(previous, 'Expand the guide.', scope),
      error => error instanceof ScopeExpansionError && error instanceof CorrectionError && error.code === 'authority-required');
  }
  assert.equal(JSON.stringify(previous), snapshot);
  assertCurrentPlanResult(previous, { planId: previous.id, planDigest: previous.digest });

  const first = correctionFor(previous, 'Clarify the introduction.', {
    scopeExpanding: false, expandWorkspace: null, expandPaths: null, newCriterionGrant: false,
  });
  const second = correctionFor(first, 'Clarify the conclusion.');
  assert.notEqual(second.digest, first.digest);
  assert.throws(() => correctionFor(second, 'Revise again.'), { code: 'replan-exhausted' });
});
