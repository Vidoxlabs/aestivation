# aestivation

Plan proposal, deterministic validation, review verdicts, and the assembly gate.

Aestivation is the admission and review loop in the public bloom agent family. Before work opens, it happens here: a plan is proposed, a deterministic rule pack validates it, reviewers record approve or revise verdicts, and a gate holds automatic assembly until the plan is both valid and approved. A revision verdict stops assembly; the reasons say what to change; the next plan is a new proposal.

## Status

Version 0.2.0. Contracts and modules only; nothing shipped runtime-wise. The plan rule pack, the verdict ledger, and the assembly gate are `implemented` as a tested reference library. A durable ledger, live reviewers, and any service shape are `specified` or `planned`, not built.

## Install

```bash
npm install @vidoxlabs/aestivation
```

Requires Node >= 22.13. Zero runtime dependencies.

## Modules

| Module | What it holds | Label |
| :--- | :--- | :--- |
| `plan.mjs` | Plan proposals: objective plus ordered steps, and the deterministic rule pack that validates stages, titles, and order. | `implemented` |
| `verdict.mjs` | Verdict records (approve or revise), the append-only ledger, and the soundness check over every record. | `implemented` |
| `gate.mjs` | The assembly gate: one function that checks the ledger and composes validation and verdicts into permitted or held, with the reason. | `implemented` |

## The name

Aestivation is the arrangement of petals in a bud before it opens. That is the entire doctrine: the work of arranging before the opening. Nothing assembles until the arrangement has been validated and reviewed — and when it opens, it opens because the gate said so for stated reasons.

## The rule pack

The baseline deterministic rules a plan must pass:

1. A plan has at least one step.
2. Every step names a known stage: `research`, `work`, `review`, `assemble`, or `verify`.
3. Every step has a non-empty title.
4. When review and assemble are both present, review precedes the first assemble.
5. When verify is present, it is the final step.

Deterministic means deterministic: the same plan validates the same way every time, and no review can wave it through. Conversely, no rule pack can approve a plan on a reviewer's behalf either — judgment and rules are separate lanes that the gate composes.

## The family

Aestivation is one of five named projects that share one design law — ordinary botanical words for public products, mirroring five flower-named personas:

| Name | Province |
| :--- | :--- |
| [`seed`](https://github.com/Vidoxlabs/seed) | The agent harness foundation: instructions to modules to tools, with the run model in between. |
| [`capillary`](https://github.com/Vidoxlabs/capillary) | Context retrieval and relations, provenance-first. |
| [`myosotis`](https://github.com/Vidoxlabs/myosotis) | Governed memory: consent to keep, promise to forget. |
| `aestivation` (this repo) | Plan proposal, deterministic validation, review verdicts, and the assembly gate. |
| [`drosera`](https://github.com/Vidoxlabs/drosera) | The tooling fabric: tool faces, skills, hooks, cookbooks. |
| [`trellis`](https://github.com/Vidoxlabs/trellis) | The testing lattice: multi-point probes over the family. |
| [`bloom`](https://github.com/Vidoxlabs/bloom) | The agent harness the family serves: an environment where agents run. |

## Documentation

- `docs/charter.md` — mission, principles, non-goals.
- `docs/architecture.md` — the bud and its four whorls.
- `docs/contracts/` — the plan, verdict, and gate contracts.
- `docs/interop.md` — how bloom runs the loop, and how seed carries its effects.

## Development

```bash
npm test
```

Tests use the Node built-in runner. Adding a rule means adding the test that holds it.

## License

MIT
