// The gate refuses a ledger it cannot trust. Contracts: docs/contracts/verdict.md, docs/contracts/gate.md

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  VERSION,
  HELD_REASONS,
  verdictRecord,
  isSoundVerdictLedger,
  assemblyGate,
} from '../src/index.mjs';

const valid = { ok: true, errors: [] };
const approve = verdictRecord({ planId: 'plan-1', decision: 'approve', judge: 'reviewer-a' });

test('held reasons are a closed, ordered set', () => {
  assert.deepEqual(HELD_REASONS, ['plan-invalid', 'ledger-unsound', 'awaiting-verdict', 'revisions-requested']);
});

test('ledger soundness checks every record, not only its plan reference', () => {
  const forged = { planId: 'plan-1', decision: 'approve' };                     // no judge
  const bareRevise = { planId: 'plan-1', decision: 'revise', judge: 'reviewer-a', reasons: [] };
  const soundness = isSoundVerdictLedger([approve, forged, bareRevise], ['plan-1']);
  assert.equal(soundness.ok, false);
  assert.match(soundness.errors.join('\n'), /verdict 1: .*judge/);
  assert.match(soundness.errors.join('\n'), /verdict 2: .*at least one reason/);
  assert.equal(isSoundVerdictLedger([approve], ['plan-1']).ok, true);
});

test('a ledger that is not a list is unsound', () => {
  assert.equal(isSoundVerdictLedger('approve', ['plan-1']).ok, false);
  assert.equal(isSoundVerdictLedger([null], ['plan-1']).ok, false);
});

test('a forged approval cannot open the gate', () => {
  const gate = assemblyGate({ validation: valid, verdicts: [{ planId: 'plan-1', decision: 'approve' }], planId: 'plan-1' });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'ledger-unsound');
  assert.equal(gate.verdict, null);                     // an untrusted verdict is not surfaced as the answer
  assert.equal(gate.ledger.ok, false);
});

test('one malformed record anywhere makes the whole ledger untrusted', () => {
  const otherPlanJunk = { planId: 'plan-2', decision: 'maybe', judge: 'reviewer-b' };
  const gate = assemblyGate({ validation: valid, verdicts: [approve, otherPlanJunk], planId: 'plan-1' });
  assert.equal(gate.held, 'ledger-unsound');
});

test('given known plans, a dangling reference holds the gate', () => {
  const ghost = verdictRecord({ planId: 'ghost-plan', decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({ validation: valid, verdicts: [approve, ghost], planId: 'plan-1', knownPlanIds: ['plan-1'] });
  assert.equal(gate.held, 'ledger-unsound');
  assert.match(gate.ledger.errors[0], /unknown plan "ghost-plan"/);
  const fine = assemblyGate({ validation: valid, verdicts: [approve], planId: 'plan-1', knownPlanIds: new Set(['plan-1']) });
  assert.equal(fine.permitted, true);
});

test('the gated plan itself must be known when known plans are given', () => {
  const gate = assemblyGate({ validation: valid, verdicts: [], planId: 'plan-3', knownPlanIds: ['plan-1'] });
  assert.equal(gate.permitted, false);
  assert.equal(gate.held, 'ledger-unsound');
  assert.match(gate.ledger.errors.join('\n'), /plan "plan-3" is not a known plan/);
});

test('plan-invalid still outranks an unsound ledger', () => {
  const gate = assemblyGate({ validation: { ok: false, errors: ['x'] }, verdicts: 'junk', planId: 'plan-1' });
  assert.equal(gate.held, 'plan-invalid');
  assert.equal(gate.ledger.ok, false);
});

test('a sound ledger leaves the gate answering as before', () => {
  const gate = assemblyGate({ validation: valid, verdicts: [approve], planId: 'plan-1' });
  assert.equal(gate.permitted, true);
  assert.equal(gate.held, null);
  assert.deepEqual(gate.ledger, { ok: true, errors: [] });
});

test('the exported version matches the package', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(VERSION, pkg.version);
});
