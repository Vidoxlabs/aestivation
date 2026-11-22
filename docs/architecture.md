# Aestivation architecture

Four whorls, one gate.

```
            ┌─────────────────────────────────────────────┐
            │                  the bud                     │
            │                                              │
 proposal ──►│  rule pack ──► verdict ledger ──► the gate  │──► assembly permitted
   {objective,                                 held?        (or held, with reason)
    steps[]}    deterministic   judgment,        reason:
                yes/no          with reasons     plan-invalid
                                                 awaiting-verdict
                                                 revisions-requested
            └─────────────────────────────────────────────┘
```

## The proposal

A plan is an objective plus ordered steps. Each step names a stage from a closed set — `research`, `work`, `review`, `assemble`, `verify` — and carries a title. The proposal is the unit of review: reviewers read it whole, and a revised plan is a new proposal, not an edit of the old one in place.

## The rule pack

Deterministic validation of shape and order. Same input, same verdict, every time, no exceptions, no authority. The baseline pack:

- at least one step;
- known stages only;
- non-empty titles;
- review before the first assemble when both are present;
- verify is the final step when present.

A caller can swap in a stricter pack. It cannot swap in a looser one that outputs `ok` for plans these rules reject — the baseline is a floor, and the gate consults the pack it was given, whose rules are on its face.

## The verdict ledger

Review is recorded, not remembered. Each verdict names its plan, carries a decision from `{approve, revise}`, names the judge, and — when the decision is revise — carries at least one reason. The ledger is append-only: soundness means every verdict references a known plan and every record is well-formed. The latest verdict for a plan is the one that counts; history stays underneath it.

## The gate

One composition, one answer. Given a validation result and a ledger, the gate answers: is automatic assembly of this plan permitted? Held reasons, in order:

1. `plan-invalid` — the rule pack rejected it. Deterministic outranks judgment; an approval cannot rescue an invalid plan.
2. `awaiting-verdict` — no verdict exists for the plan. Unreviewed plans do not self-assemble.
3. `revisions-requested` — the latest verdict is revise. The reasons say what to change; the plan comes back as a new proposal.

Permitted means one thing: valid plan, approved by the latest verdict. Not good, not owner-ratified, not deployed — permitted to assemble, with the ledger showing exactly why.

## What this edition is

`src/` implements the four parts as pure functions over plain data: the rule pack, verdict construction and ledger soundness, and the gate. No I/O, no persistence, no concurrency. A durable ledger behind this state machine is `specified` in the contracts; the mapping onto any particular store is deliberately out of scope here.
