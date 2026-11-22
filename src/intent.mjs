// Aestivation intent: a read-only assessment of what a request needs.
// An assessment is advice to the admission loop. It names evidence needs. It
// never grants a tool, a memory write, or any other authority, and composing it
// with an admission returns that admission's lists unchanged.

export const EVIDENCE_NEEDS = Object.freeze(
  new Set(['project-knowledge', 'live-state', 'durable-memory', 'none'])
);

// Fields that would carry authority. An assessment that arrives with any of them is refused.
const AUTHORITY_FIELDS = Object.freeze([
  'tools', 'allowedTools', 'memoryWrites', 'grants', 'scopes', 'actions',
]);

export class IntentError extends Error {
  constructor(issues) {
    super(`invalid intent assessment: ${issues.join('; ')}`);
    this.name = 'IntentError';
    this.issues = issues;
  }
}

const ASSESSMENTS = new WeakSet();

export function intentAssessment(input = {}) {
  const issues = [];
  if (input === null || typeof input !== 'object') throw new IntentError(['an assessment must be an object']);
  for (const field of AUTHORITY_FIELDS) {
    if (Object.hasOwn(input, field)) issues.push(`an assessment grants nothing; it may not carry ${field}`);
  }
  const { label, needs = [], confidence = null } = input;
  if (typeof label !== 'string' || label.length === 0) issues.push('label must be a non-empty string');
  if (!Array.isArray(needs) || needs.some((need) => !EVIDENCE_NEEDS.has(need))) {
    issues.push(`needs must list evidence needs from ${[...EVIDENCE_NEEDS].join(', ')}`);
  }
  if (confidence !== null && (typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1))) {
    issues.push('confidence must be a number from 0 to 1, or null');
  }
  if (issues.length > 0) throw new IntentError(issues);
  const record = Object.freeze({
    label,
    needs: Object.freeze([...new Set(needs)]),
    confidence,
    authority: 'advisory',
  });
  ASSESSMENTS.add(record);
  return record;
}

/** True only for a record made by intentAssessment. A look-alike object is not one. */
export function isIntentAssessment(value) {
  return value !== null && typeof value === 'object' && ASSESSMENTS.has(value);
}

function stringList(value, name) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new IntentError([`${name} must be a list of non-empty strings`]);
  }
  return Object.freeze([...value]);
}

/**
 * Compose an admission with an intent assessment. `admission` is
 * `{ allowedTools, memoryWrites }`, decided elsewhere. The result carries the same two
 * lists, copied and frozen, plus the assessment and `memoryRecallAdvised` when the
 * assessment names `durable-memory`. Recall is advice to read; it is never a write.
 * The input admission is not mutated. A value that is not an assessment record is
 * refused, so a forged object cannot smuggle a tool in.
 */
export function admitWithIntent(admission, assessment) {
  if (admission === null || typeof admission !== 'object') throw new IntentError(['an admission must be an object']);
  if (!isIntentAssessment(assessment)) {
    throw new IntentError(['only an assessment made by intentAssessment composes with an admission']);
  }
  const allowedTools = stringList(admission.allowedTools ?? [], 'allowedTools');
  const memoryWrites = stringList(admission.memoryWrites ?? [], 'memoryWrites');
  return Object.freeze({
    allowedTools,
    memoryWrites,
    intent: assessment,
    memoryRecallAdvised: assessment.needs.includes('durable-memory'),
  });
}
