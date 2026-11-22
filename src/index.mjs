// Aestivation: plan proposal, deterministic validation, review verdicts,
// and the assembly gate. The public face of the reference library.

export {
  STAGE_KINDS,
  PlanError,
  validatePlan,
  planProposal,
} from './plan.mjs';
export {
  DECISIONS,
  VerdictError,
  verdictRecord,
  isSoundVerdictLedger,
  latestVerdict,
} from './verdict.mjs';
export { assemblyGate } from './gate.mjs';

export const VERSION = '0.1.0';

export function about() {
  const lines = [
    `aestivation ${VERSION}`,
    'plan proposal, deterministic validation, review verdicts, the assembly gate',
    '',
    'modules:',
    '  plan    proposals and the deterministic rule pack',
    '  verdict recorded review on an append-only ledger',
    '  gate    one composition: permitted or held, with the reason named',
    '',
    'stages: research, work, review, assemble, verify',
    'gate order: plan-invalid, awaiting-verdict, revisions-requested',
    'the loop never ratifies for the owner',
  ];
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(about());
}
