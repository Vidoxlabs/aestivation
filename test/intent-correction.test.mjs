// Read-only intent, immutable correction, and no self-applied patch.
// Contract: docs/contracts/plan.md

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  intentAssessment,
  isIntentAssessment,
  admitWithIntent,
  IntentError,
  EVIDENCE_NEEDS,
  planProposal,
  verdictRecord,
  correctPlan,
  assertCurrentPlanResult,
  CorrectionError,
  CORRECTION_REFUSALS,
  assemblyGate,
  validatePlan,
} from '../src/index.mjs';

test('an intent assessment is a frozen, advisory record', () => {
  const assessment = intentAssessment({ label: 'resume-thread', needs: ['durable-memory'], confidence: 0.8 });
  assert.equal(assessment.authority, 'advisory');
  assert.equal(Object.isFrozen(assessment), true);
  assert.equal(Object.isFrozen(assessment.needs), true);
  assert.throws(() => { assessment.needs.push('live-state'); }, TypeError);
  assert.deepEqual([...EVIDENCE_NEEDS].sort(), ['durable-memory', 'live-state', 'none', 'project-knowledge']);
});

test('an intent assessment cannot carry a tool or a memory write', () => {
  for (const field of ['tools', 'allowedTools', 'memoryWrites', 'grants']) {
    assert.throws(() => intentAssessment({ label: 'x', [field]: ['docs.file.write'] }), IntentError);
  }
  assert.throws(() => intentAssessment({ label: 'x', needs: ['write-memory'] }), IntentError);
  assert.throws(() => intentAssessment({ label: '' }), IntentError);
  assert.throws(() => intentAssessment({ label: 'x', confidence: 2 }), IntentError);
});

test('composing an assessment with an admission adds no tool and no memory write', () => {
  const admission = { allowedTools: ['docs.file.read'], memoryWrites: [] };
  const assessment = intentAssessment({ label: 'recall', needs: ['durable-memory', 'live-state'] });
  const composed = admitWithIntent(admission, assessment);
  assert.deepEqual(composed.allowedTools, ['docs.file.read']);
  assert.deepEqual(composed.memoryWrites, []);
  assert.equal(composed.memoryRecallAdvised, true);                       // advice to read, not a write
  assert.equal(composed.intent, assessment);
  assert.deepEqual(admission, { allowedTools: ['docs.file.read'], memoryWrites: [] }); // input untouched
  assert.throws(() => { composed.allowedTools.push('docs.file.write'); }, TypeError);
});

test('a look-alike assessment cannot smuggle authority into an admission', () => {
  const forged = Object.freeze({ label: 'x', needs: [], confidence: null, authority: 'advisory', tools: ['docs.file.write'] });
  assert.equal(isIntentAssessment(forged), false);
  assert.throws(() => admitWithIntent({ allowedTools: [] }, forged), IntentError);
  assert.throws(() => admitWithIntent({ allowedTools: [] }, { ...intentAssessment({ label: 'x' }) }), IntentError);
});

test('read-only grounding names each required source that is missing', () => {
  const assessment = intentAssessment({ label: 'verify', needs: ['live-state', 'project-knowledge'] });
  const admission = { availableSources: ['live-state'], allowedTools: [], memoryWrites: [] };
  const result = admitWithIntent(admission, assessment);
  assert.deepEqual(assessment.evidencePolicy, { missingSource: 'state-unavailable', personalRecall: 'admitted-memory-only' });
  assert.ok(Object.isFrozen(assessment.evidencePolicy));
  assert.deepEqual(result.evidence.missingSources, ['project-knowledge']);
  assert.match(result.evidence.statement, /project-knowledge/);
  assert.deepEqual(result.allowedTools, []);
  assert.deepEqual(result.memoryWrites, []);
  const withSource = admitWithIntent({ availableSources: ['live-state', 'project-knowledge'] }, assessment);
  assert.deepEqual(withSource.evidence.missingSources, []);
  assert.equal(withSource.evidence.statement, null);
});

test('personal recall uses only references admitted by the caller', () => {
  const assessment = intentAssessment({ label: 'recall', needs: ['durable-memory'], admittedMemory: ['model-suggestion'] });
  const admission = { availableSources: ['durable-memory'], history: ['past message'], allowedTools: ['read'], memoryWrites: [] };
  const unavailable = admitWithIntent(admission, assessment);
  assert.equal(unavailable.memoryRecallAdvised, true);
  assert.deepEqual(unavailable.evidence.admittedMemory, []);
  assert.deepEqual(unavailable.evidence.missingSources, ['durable-memory']);
  assert.match(unavailable.evidence.statement, /durable-memory/);
  assert.deepEqual(unavailable.allowedTools, ['read']);
  assert.deepEqual(unavailable.memoryWrites, []);

  const references = ['memory-1'];
  const composed = admitWithIntent({ ...admission, admittedMemory: references }, assessment);
  references.push('memory-2');
  assert.deepEqual(composed.evidence.admittedMemory, ['memory-1']);
  assert.deepEqual(composed.evidence.missingSources, []);
  assert.ok(Object.isFrozen(composed.evidence));
  assert.ok(Object.isFrozen(composed.evidence.admittedMemory));
  assert.deepEqual(admitWithIntent({ admittedMemory: references }, intentAssessment({ label: 'greeting', needs: ['none'] })).evidence.admittedMemory, []);
});

const plan = () => planProposal({
  id: 'plan-1',
  objective: 'Ship the guide.',
  steps: [
    { stage: 'work', title: 'Draft' },
    { stage: 'review', title: 'Review' },
    { stage: 'assemble', title: 'Assemble' },
  ],
});

const revise = (previous, judge = 'reviewer-a') => verdictRecord({
  planId: previous.id, planDigest: previous.digest, decision: 'revise', judge, reasons: ['add a verify step'],
});

const correctedSteps = [
  { stage: 'work', title: 'Draft' },
  { stage: 'review', title: 'Review' },
  { stage: 'assemble', title: 'Assemble' },
  { stage: 'verify', title: 'Verify' },
];

test('a correction stores a new digest and does not mutate the previous plan', () => {
  const previous = plan();
  const snapshot = JSON.stringify(previous);
  const { proposal, correction } = correctPlan({
    previous, verdict: revise(previous), author: 'implementer-b', steps: correctedSteps,
  });
  assert.equal(JSON.stringify(previous), snapshot);                       // the reviewed plan is unchanged
  assert.equal(Object.isFrozen(previous), true);
  assert.equal(proposal.id, previous.id);
  assert.notEqual(proposal.digest, previous.digest);
  assert.deepEqual(correction, {
    planId: 'plan-1',
    previousDigest: previous.digest,
    digest: proposal.digest,
    reviewedBy: 'reviewer-a',
    author: 'implementer-b',
    reasons: ['add a verify step'],
  });
  assert.equal(Object.isFrozen(correction), true);

  // The old approval cannot open the gate for the corrected plan: it reviewed another digest.
  const oldApproval = verdictRecord({ planId: 'plan-1', planDigest: previous.digest, decision: 'approve', judge: 'reviewer-a' });
  const gate = assemblyGate({
    validation: validatePlan(proposal.steps), verdicts: [oldApproval], planId: 'plan-1', planDigest: proposal.digest,
  });
  assert.equal(gate.held, 'review-stale');
});

test('a reviewer cannot apply its own patch', () => {
  const previous = plan();
  assert.throws(
    () => correctPlan({ previous, verdict: revise(previous, 'reviewer-a'), author: 'reviewer-a', steps: correctedSteps }),
    (error) => error instanceof CorrectionError && error.code === 'reviewer-cannot-apply',
  );
  assert.throws(
    () => correctPlan({ previous, verdict: revise(previous), steps: correctedSteps }),
    (error) => error.code === 'reviewer-cannot-apply',                    // an unnamed author is not someone else
  );
});

test('a correction needs a revise of this exact version, and must change the plan', () => {
  const previous = plan();
  const code = (input) => { try { correctPlan(input); return null; } catch (error) { return error.code; } };
  const approve = verdictRecord({ planId: 'plan-1', planDigest: previous.digest, decision: 'approve', judge: 'reviewer-a' });
  assert.equal(code({ previous, verdict: approve, author: 'implementer-b', steps: correctedSteps }), 'correction-not-needed');
  const otherVersion = verdictRecord({ planId: 'plan-1', planDigest: 'f'.repeat(64), decision: 'revise', judge: 'r', reasons: ['x'] });
  assert.equal(code({ previous, verdict: otherVersion, author: 'implementer-b', steps: correctedSteps }), 'review-mismatch');
  const noDigest = verdictRecord({ planId: 'plan-1', decision: 'revise', judge: 'r', reasons: ['x'] });
  assert.equal(code({ previous, verdict: noDigest, author: 'implementer-b', steps: correctedSteps }), 'review-mismatch');
  assert.equal(code({ previous, verdict: revise(previous), author: 'implementer-b' }), 'correction-unchanged');
  assert.deepEqual([...CORRECTION_REFUSALS], [
    'correction-not-needed', 'review-mismatch', 'reviewer-cannot-apply', 'correction-unchanged',
    'order-superseded', 'replan-exhausted', 'result-mismatch',
  ]);
});

const replan = (previous, objective) => correctPlan({ previous, verdict: revise(previous), author: 'implementer-b', objective }).proposal;
const resultFor = proposal => ({ planId: proposal.id, planDigest: proposal.digest });

test('superseded proposals refuse late results and further corrections', () => {
  const previous = plan();
  const changed = replan(previous, 'Ship the reviewed guide.');
  assert.throws(() => replan(previous, changed.objective), { code: 'order-superseded' });
  assert.throws(() => assertCurrentPlanResult(changed, resultFor(previous)), { code: 'order-superseded' });
  assert.throws(() => assertCurrentPlanResult(previous, resultFor(previous)), { code: 'order-superseded' });
  assert.throws(() => assertCurrentPlanResult(changed, { ...resultFor(changed), planId: 'different-plan' }), { code: 'result-mismatch' });
  assert.doesNotThrow(() => assertCurrentPlanResult(changed, resultFor(changed)));
});

test('a parent plan spends at most two replans and cannot restore a retired digest', () => {
  const previous = plan();
  const first = replan(previous, 'Ship the reviewed guide.');
  assert.throws(() => replan(first, previous.objective), { code: 'order-superseded' });
  assert.throws(() => replan(first, first.objective), { code: 'correction-unchanged' });
  const second = replan(first, 'Ship the verified guide.');
  assert.throws(() => replan(second, 'Ship a third revision.'), { code: 'replan-exhausted' });
  assert.doesNotThrow(() => assertCurrentPlanResult(second, resultFor(second)));
  assert.doesNotThrow(() => replan(plan(), 'Start a separate run with the same plan ID.'));
});
