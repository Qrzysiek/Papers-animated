# Note pipeline pilots, November 2026

This is the record behind the current note-building setup: the three-phase agent pipeline and the context rules in
`skills/live-series/SKILL.md`, `skills/live-series/note-agent.md` and the "Context and cost" section of `SKILL.md`
(commit 16aea99). It also explains why `LP.chart` gained panels (commit 93557d1). All of this was measured on
2026-11-23/24 in the Nielsen_Geometry series, by rebuilding its Krylov note from scratch three times. The pilot
working folders were deleted afterwards. The files below keep everything needed to repeat the runs or check the
conclusions.

| File | What it is |
|:--|:--|
| `brief.md` | The note brief, the same for every pilot |
| `outline.md` | Pilot 2's outline and work split: section files, labels, verify groups |
| `prompts.md` | The exact prompt and options of every agent launched in the pilots |
| `kitaev-{A-low,B-pilot2,C-default}.{md,js}` | The three Kitaev sections the blind judge compared in pilot 3 |

## Question

Can a note at the series' depth, with derived results, a script and test for every number, live figures and a LaTeX
PDF, be built for less than the original Krylov note cost, without losing quality? Where do the tokens go?

## Common setup

- **Test note:** "Chaos and Krylov Complexity", the companion note on Krylov complexity of the Nielsen series. The
  original was written earlier in a long main session.
- **Isolation:** each pilot ran in its own copy of the series skeleton. The copy held `notes/common.md`,
  `notation.md`, `refs.json`, `series.json` and `briefs/`, with empty `scripts/` and `tests/`. Every prompt forbade
  opening the existing note, its scripts and tests, and the other pilots. The runs were blind benchmarks.
- **Agents:** general-purpose agents (Agent tool) on Opus 5.5 at default reasoning effort, unless a row below says
  otherwise. The toolkit and skills were at their state of 2026-11-23, before the rules recorded here.
- **Cost accounting:** token counts come from the agents' transcripts (`usage` of each API turn).
  - *Context* is all input of a turn: uncached input, cache writes and cache reads.
  - *Input-equivalent* weights tokens by API price ratios: cache read 0.1×, fresh input (uncached + cache write)
    1.25×, output 5×. This is the cost figure used throughout.
  - *Peak* is the largest context of a single turn.

## Pilot 1: one agent, then polish

**Setup:** one agent got the brief. It verified every result (`scripts/krylov.py`, `tests/test_krylov.py`), then
wrote the note and its figures and ran the check loop and the PDF build. A second agent then finished the layout.

| Agent | Turns | Context | Output | Peak | Input-eq. |
|:--|--:|--:|--:|--:|--:|
| Rebuild the note from the brief | 162 | 48.8 M | 275 k | 448 k | 6.86 M |
| Polish | 24 | 1.2 M | 9 k | 60 k | 0.24 M |
| **Total** | 186 | 50.0 M | 284 k | | **7.1 M** |

**Outcome:** 5,900 words, 41 display equations, 10 PDF pages, 51 tests, 8 live figures. This was the most expensive
per word of the three versions. Its context ballooned because the whole note sat in one agent: by the end every turn
re-read about 450 k tokens.

## Pilot 2: verify, write, polish

**Setup:** the orchestrator (the main session) wrote `outline.md`. It fixes section files, labels and the split into
three verify groups. Three phases followed, each by fresh agents that hand over through files:

1. **Verify, three agents in parallel.**
   - Groups: *conj* (conjugate points and the appendix), *lanczos* (Lanczos, spread, Krylov vs Nielsen), *bulk*
     (chord chain, Kitaev chain, open systems).
   - Each wrote `scripts/krylov_<group>.py`, `tests/test_krylov_<group>.py` and the figure data
     `figures/_k<group>.json`.
   - Each also wrote `results-<group>.md`: statements, conventions, derivation steps, tests, the numbers to quote and
     the dataset keys. These files are the only thing the writers know.
2. **Write, two agents in parallel**: sections 1–5 and sections 6–10. They read only the brief, the outline, the
   results files and the authoring docs.
3. **Polish, one agent on Sonnet** (`model: "sonnet"`): check loop, PDF and overfull boxes. It made layout changes
   only.

| Phase / agent | Turns | Context | Output | Peak | Input-eq. |
|:--|--:|--:|--:|--:|--:|
| Verify: conjugate points | 63 | 9.27 M | 165 k | 231 k | 1.99 M |
| Verify: Lanczos and spread | 38 | 4.75 M | 121 k | 180 k | 1.26 M |
| Verify: chords, Kitaev, open | 21 | 2.41 M | 109 k | 157 k | 0.96 M |
| Write: sections 1–5 | 22 | 3.12 M | 109 k | 200 k | 1.13 M |
| Write: sections 6–10 | 35 | 4.84 M | 79 k | 173 k | 1.15 M |
| Polish (Sonnet) | 19 | 0.90 M | 5 k | 54 k | 0.18 M |
| **All agents** | 198 | 25.3 M | 588 k | | **6.7 M** |
| Orchestrator (main session, already ~540 k deep) | 24 | 12.0 M | 16 k | | ~1.3 M |
| **Total** | | | | | **8.0 M** |

The first polish launch died on the usage limit (HTTP 429) before its first call. It was relaunched unchanged and
the failed launch cost nothing.

**Outcome:** 8,900 words, 58 display equations, 14 PDF pages, 112 tests, 7 live figures. `livepaper check` passed
with 0 overfull boxes. The run went beyond the brief in places. For example, it gives the Kitaev complexity per site
in closed form with dilogarithms, and it shows that on three and four qubits the conjugate time of every
Hamiltonian class has a finite limit as the penalty grows.

## Comparison

| | Original | Pilot 1 | Pilot 2 |
|:--|--:|--:|--:|
| Cost, input-equivalent | ~6.4 M (estimate¹) | 7.1 M | 8.0 M (6.7 M without the orchestrator) |
| Words | 4,700 | 5,900 | 8,900 |
| Display equations | 20 | 41 | 58 |
| PDF pages | 8 | 10 | 14 |
| Tests | 19 | 51 | 112 |
| Live figures | 9 | 8 | 7 |
| **Cost per 1,000 words** | 1.37 M | 1.21 M | **0.90 M** (0.76 M without the orchestrator) |

¹ The original's fresh-input count was not recorded.

These are size measures. Only one section was judged for quality, blind, in pilot 3. The original is the only
version with five-qubit conjugate times (a 35-minute computation). Pilot 2 lists them as a next step.

## Where the tokens go

- **Retained reasoning dominates context growth.** Take the largest agent (verify: conjugate points, 63 turns). Its
  context grew from 36 k at its first turn to 231 k. Tool results made up 15 k of that and its own file
  writes 24 k; the remaining ~155 k was its own earlier reasoning, re-read on every turn. So an agent's cost grows
  roughly with the square of its turns, and a session costs about its own size on every turn.
- **Output is mostly thinking.** About 82 % of the pilot 2 agents' output was reasoning, and about 18 % was scripts,
  tests and text.
- **The results files are cheap.** The three `results-*.md` files (54 KB, ~15 k tokens) were about 3 % of the
  output. Dropping them entirely would save under 2 % of the note.
- **Shares of pilot 2's 8.0 M:**
  - re-reading context each turn: ~36 %, mostly the 63-turn verify agent;
  - thinking: ~35 %;
  - the orchestrator: ~15 %, purely because the session was long;
  - fresh input and written files: the remaining ~14 %.

## Pilot 3: writer reasoning effort

**Setup:** two copies of pilot 2 had section 7 (Kitaev chain) and its figure removed. Two writers got the same prompt
(see `prompts.md`), one at `effort: "low"` and one at default effort. Each could read only the brief, its outline
row, the notation and macros, part R5–R6 of `results-bulk.md` and the authoring docs.

A blind judge then read three drafts in random order: the low-effort draft (A), pilot 2's own section (B, written by
an agent handling five sections) and the default-effort draft (C). It checked each line by line against the R5–R6
results, which it treated as ground truth.

| | A: low effort | B: pilot 2 writer | C: default effort |
|:--|--:|--:|--:|
| Turns | 7 | (part of 35) | 12 |
| Input-equivalent | 0.13 M | – | 0.31 M |
| `wc -w` of the section (TeX included) | 656 | 845 | 853 |
| Mathematical errors | none | none | none |
| Correctness / completeness / exposition (of 10) | 9 / 8 / 7 | 9 / 10 / 8 | 10 / 9 / 9 |
| Rank | 3 | 2 | **1** |

The judge cost 0.12 M, so the whole pilot cost 0.56 M.

- **A:** a near-transcription of the results. It asserts derivation steps without showing them, drops several of
  the checks, and claims "universality" without the reason. The agent also skipped reading the live-paper skill,
  although the prompt told it to.
- **C:** the plainest prose. It also adds a correct argument the results file left implicit: a non-critical
  reference has $\theta^R_{k_c}\in\{0,\pi/2\}$, so only the sign of the coefficient depends on the reference.
- **The gap:** the judge called the gap between A and the others "noticeable", and B and C close.
- **The figure:** the results file asked for a two-panel figure, but `LP.chart` had one plot box, so every draft
  overlaid c and c′. This is why panels were added to `LP.chart`; the published Kitaev figure uses two of them.

Pilot 3 is one section and one judge, so it is a single sample.

## Decisions and their evidence

| Rule now in the skills | Evidence |
|:--|:--|
| Build each note in three phases (verify → write → polish) by fresh agents handing over through files | Pilot 1's single agent peaked at 448 k; no pilot 2 agent passed 231 k; pilot 2 costs 0.90 M per 1,000 words against 1.21 M, with twice the tests |
| Orchestrate from a fresh, short session; launch agents in one message, never poll, read only reports | Pilot 2's orchestrator: 24 turns, 12 M context, ~15 % of the note, all of it overhead |
| One verify agent per group of 2–4 results | Pilot 2's three groups. The 63-turn group alone was ~30 % of the agents' cost (quadratic growth) |
| Verify agents batch their work: all functions and tests in one go, one test command, long output to `build/*.log`, ~40-call budget, then hand over | Re-reading context ~36 % of the cost, concentrated in the longest agent. **Not yet measured:** written after the pilots |
| One or two writers sharing `briefs/<id>-outline.md` | Pilot 2's two parallel writers produced a note that builds with every cross-reference resolved, through the fixed labels |
| Writers at default effort | Pilot 3: low effort saved 0.18 M on one section but ranked clearly last. Over a note it would save under a fifth of the cost and lose exactly the derivations |
| Polish on Sonnet | Pilot 2's polish: 0.18 M on Sonnet, against 0.24 M for pilot 1's Opus polish; check passed and 0 overfull boxes |
| Do not shorten the results files | 3 % of output and the writers' only source of verified facts. Shorter files would make the writers re-derive results (more thinking) or write thinner sections |

An earlier recommendation to cap the results files was withdrawn once the output was broken down as above.

## Not tested

- The verify batching rules and the 40-call budget. The next new note is their first measurement.
- Sonnet as a writer.
- Quality across a whole note: pilots 1 and 2 were compared by size, and only one section was judged blind.

## Afterwards

Pilot 2's note replaced the original Krylov note in Nielsen_Geometry (commit 58f1760, 2026-11-24). Its labels were
renamed to the old anchors so incoming links still resolve, the Kitaev figure was redrawn with two panels, and its
scripts and tests joined the project's (132 Krylov tests). The pilot folders `pilot/`, `pilot2/` and `pilot3/` were
deleted afterwards, keeping the files in this folder.
