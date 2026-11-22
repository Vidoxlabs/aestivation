# Contract: the assembly gate

Label: `specified` (rules), `implemented` (in `src/gate.mjs`).

## Shape

```
assemblyGate({ validation, verdicts, planId }) → { permitted, held, validation, verdict }
```

## The gate's one question

Is automatic assembly of this plan permitted? The answer is composed from exactly two inputs, in a fixed order:

| Order | Condition | Held reason |
| :--- | :--- | :--- |
| 1 | `validation.ok === false` | `plan-invalid` |
| 2 | no verdict exists for the plan | `awaiting-verdict` |
| 3 | latest verdict is `revise` | `revisions-requested` |
| — | none of the above: valid plan, latest verdict `approve` | (permitted) |

## Why the order is the order

1. **Deterministic outranks judgment.** An invalid plan is held even when a reviewer approved. The rule pack's rejection cannot be overruled by a pen, and this ordering is what makes that principle structural rather than aspirational.
2. **Unreviewed never self-assembles.** A valid plan with no verdict waits. Silence is not approval and absence is not consent.
3. **Revise is a stop, not a pause of opinion.** The latest revise verdict holds assembly until a new proposal earns a new verdict. The title of the held reason names the path out: the revisions were requested, so make them.

## Output semantics

- `permitted: true` means the two lanes passed: valid, approved. Nothing more.
- `permitted: false` always carries a `held` reason from the table above. There is no naked refusal.
- The gate returns the validation and the latest verdict alongside its answer, so a caller never re-derives what the gate already judged.

## Prohibitions

- The gate never ratifies. Permission to assemble is not owner assent; effects exceeding the plan's scope route the owner's gate in the harness.
- The gate never judges content. If the rule pack and the reviewers both passed it, the gate opens whether or not a third party would have preferred different work.
- The gate never mutates its inputs. It composes; it does not rewrite the ledger or re-validate with different rules.
