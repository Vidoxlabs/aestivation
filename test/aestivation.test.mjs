// Aestivation reference library tests. Every rule that matters is visible here.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STAGE_KINDS,
  validatePlan,
  planProposal,
  DECISIONS,
  verdictRecord,
  isSoundVerdictLedger,
  latestVerdict,
  assemblyGate,
} from '../src/index.mjs';

test('the set of stages is exactly the five known stages', () => {
  assert.deepEqual([...STAGE_KINDS].sort(), ['assemble', 'research', 'review', 'verify', 'work']);
});

test('a valid plan passes the rule pack', () => {
  const result = validatePlan([
    { stage: 'research', title: 'Read the affected modules' },
    { stage: 'work', title: 'Patch the gate function' },
    { stage: 'review', title: 'Review the patch' },
    { stage: 'assemble', title: 'Assemble the release' },
    { stage: 'verify', title: 'Run the test suite' },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('a proposal freezes its steps and validates on creation', () => {
  const proposal = planProposal({
    id: 'plan-1',
    objective: 'Ship the review loop',
    steps: [
      { stage: 'research', title: 'Read the module' },
      { stage: 'work', title: 'Write the loop' },
      { stage: 'review', title: 'Review the loop' },
    ],
  });
  assert.equal(proposal.id, 'plan-1');
  assert.throws(() => { proposal.steps[0].stage = 'assemble'; }, TypeError);
});

test('an empty plan is invalid', () => {
  const result = validatePlan([]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /at least one step/);
});

test('an unknown stage is rejected, not guessed', () => {
  const result = validatePlan([{ stage: 'vibes', title: 'Feel it out' }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /unknown stage "vibes"/);
});

test('a step without a title is rejected', () => {
  const result = validatePlan([{ stage: 'work', title: '' }]);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /non-empty title/);
});

test('review must precede the first assemble step', () => {
  const result = validatePlan([
    { stage: 'work', title: 'Write' },
    { stage: 'assemble', title: 'Assemble' },
    { stage: 'review', title: 'Review too late' },
  ]);
  assert.equal(result.ok, false);
  assert.match(result.errors.find((e) => /review must precede/.test(e)), /review must precede/);
});

test('verify must be the final step', () => {
  const result = validatePlan([
    { stage: 'work', title: 'Write' },
    { stage: 'verify', title: 'Check' },
    { stage: 'assemble', title: 'Assemble after verify' },
  ]);
  assert.equal(result.ok, false);
  assert.match(result.errors.find((e) => /verify must be the final/.test(e)), /verify must be the final/);
});

test('proposal construction rejects the same shapes the rule pack rejects', () => {
  assert.throws(() => planProposal({ id: '', objective: '', steps: [] }));
  assert.throws(() =>
    planProposal({ id: 'p', objective: 'o', steps: [{ stage: 'nope', title: 't' }] })
  );
});

test('the decision set is exactly approve and revise', () => {
  assert.deepEqual([...DECISIONS].sort(), ['approve', 'revise']);
});

test('an approve verdict may carry its basis; a revise verdict must carry reasons', () => {
  const approve = verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' });
  assert.equal(approve.decision, 'approve');
  assert.deepEqual(approve.reasons, []);

  const withBasis = verdictRecord({
    planId: 'plan-1',
    decision: 'approve',
    judge: 'reviewer-a',
    reasons: ['The rule pack passes and the objective is met.'],
  });
  assert.equal(withBasis.reasons.length, 1);

  assert.throws(() => verdictRecord({ planId: 'plan-1', decision: 'revise', judge: 'reviewer-a' }));
});

test('a verdict without a judge or with an unknown decision is rejected', () => {
  assert.throws(() => verdictRecord({ planId: 'p', decision: 'approve', judge: '' }));
  assert.throws(() => verdictRecord({ planId: 'p', decision: 'maybe', judge: 'reviewer-a' }));
});

test('verdicts are frozen: the ledger is append-only', () => {
  const verdict = verdictRecord({ planId: 'p', decision: 'approve', judge: 'reviewer-a' });
  assert.throws(() => { verdict.decision = 'revise'; }, TypeError);
});

test('a ledger referencing unknown plans is unsound', () => {
  const verdict = verdictRecord({ planId: 'ghost-plan', decision: 'approve', judge: 'reviewer-a' });
  const soundness = isSoundVerdictLedger([verdict], ['plan-1', 'plan-2']);
  assert.equal(soundness.ok, false);
  assert.match(soundness.errors[0], /unknown plan "ghost-plan"/);
});

test('the latest verdict for a plan wins, and a plan with none has none', () => {
  const revise = verdictRecord({
    planId: 'plan-1',
    decision: 'revise',
    judge: 'reviewer-a',
    reasons: ['Stage order invalid.'],
  });
  const approve = verdictRecord({
    planId: 'plan-1',
    decision: 'approve',
    judge: 'reviewer-a',
    reasons: ['Revision accepted.'],
  });
  assert.equal(latestVerdict([revise, approve], 'plan-1').decision, 'approve');
  assert.equal(latestVerdict([approve, revise], 'plan-1').decision, 'revise');
  assert.equal(latestVerdict([], 'plan-1'), null);
});

test('a valid plan with no verdicts holds as awaiting-verdict', () => {
  const validation = { ok: true, errors: [] };
  const gate = assemblyGate({ validation, verdicts: [], planId: 'plan-1' });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'awaiting-verdict');
});

test('a latest revise verdict holds assembly as revisions-requested', () => {
  const validation = { ok: true, errors: [] };
  const revise = verdictRecord({
    planId: 'plan-1',
    decision: 'revise',
    judge: 'reviewer-a',
    reasons: ['Review step missing.'],
  });
  const gate = assemblyGate({ validation, verdicts: [revise], planId: 'plan-1' });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'revisions-requested');
  assert.equal(gate.verdict.decision, 'revise');
});

test('revise then re-approve permits assembly; the ledger keeps both', () => {
  const validation = { ok: true, errors: [] };
  const revise = verdictRecord({
    planId: 'plan-1',
    decision: 'revise',
    judge: 'reviewer-a',
    reasons: ['Add review stage.'],
  });
  const approve = verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation, verdicts: [revise, approve], planId: 'plan-1' });
  assert.equal(gate.permitted, true);
  assert.equal(gate.held, null);
  assert.equal(gate.verdict.decision, 'approve');
});

test('deterministic outranks judgment: an approved but invalid plan is held', () => {
  const validation = {
    ok: false,
    errors: ['review must precede the first assemble step'],
  };
  const approve = verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation, verdicts: [approve], planId: 'plan-1' });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'plan-invalid');
});

test('the gate refuses call without a validation result or planId', () => {
  assert.throws(() => assemblyGate({ verdicts: [], planId: 'p' }));
  assert.throws(() => assemblyGate({ validation: { ok: true, errors: [] }, verdicts: [] }));
});

test('end to end: an invalid proposal is rejected before any verdict can rescue it', () => {
  let validation;
  try {
    planProposal({
      id: 'plan-9',
      objective: 'Assemble before review',
      steps: [
        { stage: 'assemble', title: 'Assemble first' },
        { stage: 'review', title: 'Review after the fact' },
      ],
    });
    validation = { ok: true, errors: [] };
  } catch (error) {
    validation = { ok: false, errors: error.issues };
  }
  assert.equal(validation.ok, false);

  const approve = verdictRecord({ planId: 'plan-9', decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation, verdicts: [approve], planId: 'plan-9' });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'plan-invalid');
});
