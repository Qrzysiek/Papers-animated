# Prompts for the three agents of one note

A note is written by fresh agents in three phases (Agent tool, general-purpose, in the background): verify (one
agent per group of 2 to 4 results), write (one or two agents), polish (one, on Sonnet). An agent's context keeps
everything it has read, written and reasoned, and every turn re-reads all of it: one agent that derives, writes and
polishes a note reached 450 k tokens per turn in the Krylov pilot (162 turns, 49 M tokens), while a fresh agent did
the final check-and-polish in 24 turns at 60 k (1.2 M). Most of that growth is the agent's own earlier reasoning,
so cost grows with the square of the number of turns: few, large turns, and a fresh agent when one runs long.

Fill in the angle-bracket fields. `<P>` is the project root holding `notes/`, `scripts/`, `tests/`, and `<group>`
names the verify group (one results file per group).

## Common rules (paste into every prompt)

- Few, large turns: read each input once, all needed inputs in one call where possible; write a whole script, test
  file or section in one Write, then fix with Edit (never Write a file again); run all checks of a step in one
  command.
- Keep tool output short: send long output to a log file under `build/` and print only a summary (`tail`, `grep`);
  never print arrays or data files. For a run longer than a minute, start it in the background and wait once for
  its end instead of polling.
- Turn budget: about 40 tool calls. If the work is not done by then, write what is finished into your output file,
  and report the rest as "left"; a fresh agent continues more cheaply than a long one.

- Read nothing from other notes but the anchors you link to (`grep -n "{#sec:" <P>/notes/<other>/sections/*.md`);
  never their text, `dist/` files or page images.
- `livepaper` is on the PATH (else `node C:/Users/qrzys/Documents/Projects/Papers_animated/bin/livepaper.mjs`).
  Heredocs in the Bash tool eat backslashes: write TeX, JS and regexes with Write/Edit.
- Do not publish or commit. Edit only `notes/<id>/`, `scripts/<id>*.py`, `tests/test_<id>.py`, `notes/refs.json`,
  `notes/ref-summaries.txt`.
- Look at each image at most once; never re-read a file you wrote unless a check points into it (use grep, or Read
  with offset/limit).

## Agent 1: verify (script, tests, figure data)

Read the brief `<P>/notes/briefs/<id>.md` (only the results of group `<group>`) and `<P>/notes/notation.md`. First
work out, in one pass of reasoning, how to check every closed form and number of your group; then write all the
functions in `<P>/scripts/<id>_<group>.py` and all the tests in `<P>/tests/test_<id>_<group>.py` in one Write each,
and run them in one command (from `<P>`: `mkdir -p build && uv run pytest -q tests/test_<id>_<group>.py >
build/pytest-<group>.log; tail -5 build/pytest-<group>.log`). Use the wolfram-engine skill for symbolic checks when a derivation is not obvious, all
the identities of the group in one script; keep any single computation under about 10 minutes. The script writes the
figure data to `<P>/notes/<id>/figures/_<id><group>.json`. Then write `<P>/notes/<id>/results-<group>.md`: for each
result, the statement in final form (TeX), the conventions, the derivation in 3 to 10 lines (the steps the text must
show), the test that checks it, and the dataset keys for each figure. This file is all the writers will know.
Report in at most 8 lines: results verified, any that failed or changed, test count.

## Agent 2: write (text and figures)

Read the brief, the outline `briefs/<id>-outline.md` (your rows), `notation.md`, `common.md`, the results files
your sections draw on (`results-<group>.md`), the live-paper skill (`~/.claude/skills/live-paper/SKILL.md`) and the
README sections "Authoring" and "Chart and diagram figures"
(`C:\Users\qrzys\Documents\Projects\Papers_animated\README.md`), in one or two calls. Do not open the scripts beyond
their function names, nor the other writer's sections (their labels: `grep -n "^#" sections/*.md`). Writer 1 writes
`paper.md` (title, subtitle, pagetitle, runhead, topics, keywords, abstract; keep `series`, `series-id`, `sections`);
each writer writes its `sections/NN-*.md`, each in one Write: derive the results as the results files lay out, plain
direct prose, 10 to 14 pages for the note, ending with "Open problems" (question, what is known, next step). Figures as `LP.chart` / `LP.diagram` specs
on `LP.ds.<id>` (several plots in one figure: `LP.chart({ panels: [...] })`, not overlaid curves); a full module only when no component fits. Cite only keys from `livepaper bib keys notes/refs.json`.
Build once (`livepaper build paper.md`) and fix build errors (KaTeX, missing figures, unresolved references); leave
layout to agent 3. Report in at most 8 lines: sections, figures, open problems (one line each).

## Agent 3: check and polish (Sonnet)

Launch with `model: "sonnet"`; it fixes layout only, so it does not need the writers' model. Run `livepaper check paper.md` in the note folder and fix every listed problem (for a figure label problem open only
`build/check/lint-<figure>.png`); make sure every figure is referenced in the text (figures attached to the abstract
excepted) and every table fits a column or is `.wide`. Look once at `build/check/sheet.png`, and at a single page only
where the sheet shows something wrong. Then `livepaper build paper.md --pdf`; `grep -c Overfull build/paper.log`
must print 0 (split wide equations with `aligned`; give table separators proportional widths). Look at two PDF pages
at most (`pdftoppm -r 50 -png -f N -l N dist/paper.pdf build/pdfp`). Report in at most 10 lines: fixes, check status,
pages, overfull count, anything left.
