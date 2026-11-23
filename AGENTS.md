# Aestivation workspace

## What this is

Aestivation is the admission and review loop in the public bloom agent family. It holds the contracts and modules for the part of agent work that happens before anything opens: propose a plan, validate it against deterministic rules, collect review verdicts, and hold assembly at a gate that only opens when both the rules and a reviewer say go.

This repository holds contracts first, and second a small, dependency-free reference module implementing the rule pack, the verdict ledger, and the gate. Nothing here is a service, a deployed review platform, or a model.

## Claim labels

Every capability in this repository carries exactly one label, and it must be true on its face:

- `implemented` - exists as tested code in `src/` with `npm test` coverage.
- `specified` - exists as a written contract a competent party could implement against.
- `planned` - named as an intent. Never presented as done.
- `observed` - recorded as observed behavior of another system, with its source named.

A label is a claim about this repository in its current state. When a label stops being true, the label changes or the claim is removed.

## Progress honesty

The reference modules are honest library implementations of validation and gate rules, exercised by unit tests in this repository. They are not a live review service. Nothing in this repository is deployed online. Do not write docs, READMEs, or comments that imply it is.

## Loop honesty rules

These rules bind contributions to this repository and the code it accepts:

- Deterministic checks outrank judgment. An invalid plan is held even if a reviewer approved it.
- Verdicts record review and gate assembly. They never ratify on the owner's behalf. Ratification is the owner's act, and gated effects that exceed scope route the harness's owner gate.
- A revise verdict always carries its reasons. "Change it" without saying what is not a review.
- The verdict ledger is append-only. History is not edited to make a plan look better.
- The gate answers what it is asked: is automatic assembly permitted? It does not decide whether the work is good, whether the owner agrees, or whether to proceed.

## Public safety

This is a public repository. No hostnames, addresses, ports, cluster names, container names, credentials, or personal names in any file. Examples use loopback addresses or none. A leak is a defect; finding one means fixing it before anything else ships.

## Verification

- `npm test` must stay green. A claim of `implemented` requires a passing test named for it.
- Docs change with code or they do not change at all. There is no "docs later."
- Same-PR ledger rule: update `docs/capabilities/index.json`, the owning capability spec, `docs/CHANGELOG.md`, and affected contract `Changes` sections in the same pull request as any capability change.
- Every rule in the rule pack must be visible in a test. If it cannot be tested, it is a wish, and it must be labeled `planned`, not `implemented`.

## Stay in this province

This repository is the admission loop: plan checks, verdicts, and the assembly gate. It is a peer. Seed is the floor. Capillary, myosotis, and drosera are the other peers. Bloom is the only composer. Trellis is outside the call path. This task does not edit them. An invalid plan stays held. A revise verdict keeps its reasons. The loop does not ratify for the owner.

Do not add a model, a retrieval corpus, or a memory store here.

## Where the other seven live

| The work | Repository |
| --- | --- |
| Run records, tool identity, provider shape | `seed` |
| Bounded retrieval and relations | `capillary` |
| Consent, forget, and recall | `myosotis` |
| Plans, verdicts, and the assembly gate | `aestivation` (here) |
| Tool faces, skills, hooks, cookbooks | `drosera` |
| Probes over those libraries | `trellis` |
| The team workspace a person opens | `bloom` |
| Family documentation, synced from every public repository | `docs` |

## Skills

This file is the working method. A skill adds instructions and does not open the gate. Do not add a second skill system here.

## Agents

One working method lives here. Reviewer judgment is a verdict record, not a new agent file. Do not edit a sibling from this checkout.

## References

Read in this order: this file, `docs/charter.md`, `docs/architecture.md`, `docs/contracts/`, `docs/interop.md`, `docs/capabilities/`, then `src/`. Code and `npm test` win over a stale sentence.

## Cookbook

1. Read this file and the charter.
2. Run `npm test`.
3. Change a rule only together with the test that holds it.
4. Stop at the province boundary in the table above.

This recipe is instructions. It is not a plan and not an executable cookbook.

## MCP

This repository is not an MCP server. Do not commit an MCP configuration, a server address, or a credential. Evidence a reviewer cites is retrieved elsewhere. This loop only records the judgment and the gate.
