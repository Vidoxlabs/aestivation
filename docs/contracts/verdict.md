# Contract: verdict

Label: `specified` (rules), `implemented` (ledger in `src/verdict.mjs`).

## Shape

```
verdict { planId, decision, judge, reasons[] }
decision  one of: approve, revise
```

## Rules

1. **A verdict names its plan.** `planId` is required and must reference a known proposal. The ledger's soundness check rejects dangling references.
2. **A verdict names its judge.** A review without a reviewer is not a review. `judge` is a non-empty string; who judges is the ledger's provenance.
3. **Revise carries reasons.** A `revise` decision without at least one reason is rejected. A reviewer who wants changes says what changes.
4. **Approve may carry reasons.** An approval is valid with an empty reasons list, though an approval that states its basis is the better record.
5. **The ledger is append-only.** Verdicts are frozen on creation. Correction happens by appending, never by editing history.
6. **The latest verdict counts.** A plan may be reviewed many times across revisions; the verdict in force is the last one recorded for it.

## Ledger soundness

```
isSoundVerdictLedger(verdicts, knownPlanIds) → { ok, errors[] }
```

A ledger is sound when it is a list, every verdict is a well-formed record by rules 1 through 3 (the same checks `verdictRecord` applies), and every `planId` references a known plan. Errors carry the verdict's index. An unsound ledger is refused by the gate with held reason `ledger-unsound` — the gate does not grade verdicts it cannot trust.

`implemented` in `src/verdict.mjs` and `src/gate.mjs` as of `0.2.0`; before it, soundness checked only plan references and the gate did not check it at all.

## Prohibitions

- No verdict speaks for the owner. A verdict records review; ratification is a separate act by a separate authority, always outside this loop.
- No backdating. The ledger records in order; the order is the record.
- No editing verdicts into approval. The path from revise to permitted is a new plan and a new verdict, on the record.
