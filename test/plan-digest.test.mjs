// The proposal reviewed is the proposal assembled. Contracts: plan.md, verdict.md, gate.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  HELD_REASONS,
  planProposal,
  planDigest,
  validatePlan,
  verdictRecord,
  isSoundVerdictLedger,
  assemblyGate,
} from '../src/index.mjs';

const steps = [
  { stage: 'work', title: 'Write the change' },
  { stage: 'review', title: 'Review the change' },
  { stage: 'assemble', title: 'Assemble the release' },
];
const proposal = planProposal({ id: 'plan-1', objective: 'Ship the change', steps });
const valid = validatePlan(proposal.steps);
const OTHER = 'c'.repeat(64);

test('a proposal carries the digest of its content', () => {
  assert.match(proposal.digest, /^[0-9a-f]{64}$/);
  assert.equal(planDigest(proposal), proposal.digest);
  const canonical = '{"id":"plan-1","objective":"Ship the change","steps":['
    + '{"stage":"work","title":"Write the change"},'
    + '{"stage":"review","title":"Review the change"},'
    + '{"stage":"assemble","title":"Assemble the release"}]}';
  assert.equal(proposal.digest, createHash('sha256').update(canonical, 'utf8').digest('hex'));
});

test('the digest ignores key order and moves with any content change', () => {
  const reordered = planProposal({ steps: steps.map(({ title, stage }) => ({ title, stage })), objective: 'Ship the change', id: 'plan-1' });
  assert.equal(reordered.digest, proposal.digest);
  const injected = planProposal({ id: 'plan-1', objective: 'Ship the change', steps: [...steps.slice(0, 2), { stage: 'work', title: 'Slipped in after review' }, steps[2]] });
  assert.notEqual(injected.digest, proposal.digest);
  const retitled = planProposal({ id: 'plan-1', objective: 'Ship the change, quietly', steps });
  assert.notEqual(retitled.digest, proposal.digest);
  const extraField = planProposal({ id: 'plan-1', objective: 'Ship the change', steps: [{ ...steps[0], owner: 'x' }, steps[1], steps[2]] });
  assert.notEqual(extraField.digest, proposal.digest);
});

test('a verdict may name the digest it reviewed, and it must be 64-hex', () => {
  const bound = verdictRecord({ planId: 'plan-1', planDigest: proposal.digest, decision: 'approve', judge: 'reviewer-a' });
  assert.equal(bound.planDigest, proposal.digest);
  assert.equal(verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' }).planDigest, null);
  assert.throws(() => verdictRecord({ planId: 'plan-1', planDigest: 'abc', decision: 'approve', judge: 'reviewer-a' }));
  const malformed = { planId: 'plan-1', planDigest: 'ABC', decision: 'approve', judge: 'reviewer-a', reasons: [] };
  assert.equal(isSoundVerdictLedger([malformed], ['plan-1']).ok, false);
});

test('held reasons place review-stale before revisions-requested', () => {
  assert.deepEqual(HELD_REASONS, [
    'plan-invalid', 'ledger-unsound', 'awaiting-verdict', 'review-stale', 'revisions-requested',
  ]);
});

test('an approval of the exact plan permits assembly', () => {
  const approve = verdictRecord({ planId: 'plan-1', planDigest: proposal.digest, decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation: valid, verdicts: [approve], planId: 'plan-1', planDigest: proposal.digest });
  assert.equal(gate.permitted, true);
});

test('an approval of a different version of the plan is stale', () => {
  const approve = verdictRecord({ planId: 'plan-1', planDigest: OTHER, decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation: valid, verdicts: [approve], planId: 'plan-1', planDigest: proposal.digest });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'review-stale');
  assert.equal(gate.verdict.planDigest, OTHER);
});

test('an approval that names no digest does not count once the gate is given one', () => {
  const unbound = verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation: valid, verdicts: [unbound], planId: 'plan-1', planDigest: proposal.digest });
  assert.equal(gate.held, 'review-stale');
});

test('the latest verdict still counts: a later review of another version leaves this one stale', () => {
  const approve = verdictRecord({ planId: 'plan-1', planDigest: proposal.digest, decision: 'approve', judge: 'reviewer-a' });
  const laterRevise = verdictRecord({ planId: 'plan-1', planDigest: OTHER, decision: 'revise', judge: 'reviewer-a', reasons: ['Changed again.'] });
  const gate = assemblyGate({ validation: valid, verdicts: [approve, laterRevise], planId: 'plan-1', planDigest: proposal.digest });
  assert.equal(gate.held, 'review-stale');
});

test('a revise of the exact plan still asks for revisions', () => {
  const revise = verdictRecord({ planId: 'plan-1', planDigest: proposal.digest, decision: 'revise', judge: 'reviewer-a', reasons: ['Add a verify step.'] });
  const gate = assemblyGate({ validation: valid, verdicts: [revise], planId: 'plan-1', planDigest: proposal.digest });
  assert.equal(gate.held, 'revisions-requested');
});

test('without a planDigest the gate answers as before', () => {
  const approve = verdictRecord({ planId: 'plan-1', planDigest: OTHER, decision: 'approve', judge: 'reviewer-a' });
  assert.equal(assemblyGate({ validation: valid, verdicts: [approve], planId: 'plan-1' }).permitted, true);
});

test('the gate refuses a malformed planDigest', () => {
  assert.throws(() => assemblyGate({ validation: valid, verdicts: [], planId: 'plan-1', planDigest: 'nothex' }));
});
