# Prompts for the three agents of one note

A note is written by three agents in turn, each fresh (Agent tool, general-purpose, in the background). An agent's
context keeps everything it has read, written and reasoned, and every turn re-reads all of it: one agent that
derives, writes and polishes a note reached 450 k tokens per turn in the Krylov pilot (162 turns, 49 M tokens),
while a fresh agent did the final check-and-polish in 24 turns at 60 k (1.2 M). Hand over through files, not context.

Fill in the angle-bracket fields. `<P>` is the project root holding `notes/`, `scripts/`, `tests/`.

## Common rules (paste into every prompt)

- Read nothing from other notes but the anchors you link to (`grep -n "{#sec:" <P>/notes/<other>/sections/*.md`);
  never their text, `dist/` files or page images.
- `livepaper` is on the PATH (else `node C:/Users/qrzys/Documents/Projects/Papers_animated/bin/livepaper.mjs`).
  Heredocs in the Bash tool eat backslashes: write TeX, JS and regexes with Write/Edit.
- Do not publish or commit. Edit only `notes/<id>/`, `scripts/<id>*.py`, `tests/test_<id>.py`, `notes/refs.json`,
  `notes/ref-summaries.txt`.
- Look at each image at most once; never re-read a file you wrote unless a check points into it (use grep, or Read
  with offset/limit).

## Agent 1: verify (script, tests, figure data)

Read the brief `<P>/notes/briefs/<id>.md` and `<P>/notes/notation.md`. For every closed form and number the brief
asks for, write a function in `<P>/scripts/<id>.py` and a test in `<P>/tests/test_<id>.py`
(`uv run pytest -q tests/test_<id>.py` from `<P>`); use the wolfram-engine skill for symbolic checks when a
derivation is not obvious; keep any single computation under about 10 minutes. The script writes the figure data
to `<P>/notes/<id>/figures/_<id>.json`. Then write `<P>/notes/<id>/results.md`: for each result of the brief, the
statement in final form (TeX), the conventions, the derivation in 3 to 10 lines (the steps the text must show), the
test that checks it, and the dataset keys for each figure. This file is all the next agent will know.
Report in at most 8 lines: results verified, any that failed or changed, test count.

## Agent 2: write (text and figures)

Read the brief, `notation.md`, `common.md`, `results.md`, the live-paper skill
(`~/.claude/skills/live-paper/SKILL.md`) and the README sections "Authoring" and "Chart and diagram figures"
(`C:\Users\qrzys\Documents\Projects\Papers_animated\README.md`). Do not open the script beyond its function names.
Write `paper.md` (title, subtitle, pagetitle, runhead, topics, keywords, abstract; keep `series`, `series-id`,
`sections`) and `sections/NN-*.md`: derive the results as `results.md` lays out, plain direct prose, 10 to 14
pages, ending with "Open problems" (question, what is known, next step). Figures as `LP.chart` / `LP.diagram` specs
on `LP.ds.<id>`; a full module only when no component fits. Cite only keys from `livepaper bib keys notes/refs.json`.
Build once (`livepaper build paper.md`) and fix build errors (KaTeX, missing figures, unresolved references); leave
layout to agent 3. Report in at most 8 lines: sections, figures, open problems (one line each).

## Agent 3: check and polish

Run `livepaper check paper.md` in the note folder and fix every listed problem (for a figure label problem open only
`build/check/lint-<figure>.png`); make sure every figure is referenced in the text (figures attached to the abstract
excepted) and every table fits a column or is `.wide`. Look once at `build/check/sheet.png`, and at a single page only
where the sheet shows something wrong. Then `livepaper build paper.md --pdf`; `grep -c Overfull build/paper.log`
must print 0 (split wide equations with `aligned`; give table separators proportional widths). Look at two PDF pages
at most (`pdftoppm -r 50 -png -f N -l N dist/paper.pdf build/pdfp`). Report in at most 10 lines: fixes, check status,
pages, overfull count, anything left.
