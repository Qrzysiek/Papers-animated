# Agent prompts of the pilots

Verbatim, in launch order; local paths shortened to `<nielsen>` (the Nielsen_Geometry project), `<toolkit>` (this repo) and `<scratchpad>`. Options are the Agent tool parameters besides the prompt; every agent ran on Opus 5.5 at default effort unless the options say otherwise. The first polish launch of pilot 2 died on the usage limit before its first call and was relaunched unchanged.


## Pilot: rebuild Krylov note from brief  (2026-11-23T22:19)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are writing one note of a series of live papers: `krylov`, "Chaos and Krylov Complexity", in `<nielsen>\pilot\notes\krylov\`. Call that project root `P = <nielsen>\pilot`.

This is a blind benchmark of a note-writing workflow: the main project already has its own note on this topic. Do NOT open, list or grep anything under `<nielsen>\notes\krylov\`, nor `...\Nielsen_Geometry\scripts\krylov*.py`, `...\Nielsen_Geometry\scripts\wolfram\krylov*`, `...\Nielsen_Geometry\tests\test_krylov.py`, nor the exercises note's Krylov section. Work only from the brief and the literature.

Read first, and nothing else from the other notes:
1. the brief `P\notes\briefs\krylov.md`;
2. `P\notes\notation.md` and `P\notes\common.md` (macros you may use; they are merged into your note automatically);
3. the live-paper skill `~/.claude\skills\live-paper\SKILL.md`, and in the toolkit README (`<toolkit>\README.md`) the sections "Authoring" and "Chart and diagram figures";
4. for links into other notes, only the anchors already listed in the brief (if you need more: `grep -n "{#sec:" <nielsen>\notes\<primer|physics|manybody|nielsen-review>\sections\*.md`).
Do not open other notes' text, their `dist/` files, or page screenshots of other notes.

Work in this order.

1. **Verify before writing.** Put every closed form and number the brief asks for into `P\scripts\krylov.py` with a test each in `P\tests\test_krylov.py` (run from `<nielsen>` with `uv run pytest -q pilot/tests/test_krylov.py`; numpy and scipy are available in that uv environment). Use the wolfram-engine skill for symbolic checks when a derivation is not obvious. The script also writes the figure data to `P\notes\krylov\figures\_krylov.json` (it becomes `LP.ds.krylov`). Cite only keys in `P\notes\refs.json` (`livepaper bib keys P/notes/refs.json`); if a reference is missing, add it with `livepaper bib add P/notes/refs.json arXiv:<id>` and give it a summary line with `livepaper bib summaries` (a file of "key: summary" lines). Keep any single computation under about 10 minutes.
2. **Write** `paper.md` (front matter: title, subtitle, pagetitle, runhead, topics, keywords, abstract; keep `series`, `series-id`, `sections`) and `sections/NN-*.md`. Derive results, don't just state them; plain, direct prose; 10 to 14 pages. Close with an "Open problems" section (each: the question, what is known, a next step). Link background with `[text](note:<id>#sec-<label>)`.
3. **Figures** as specs: `export default LP.chart({...})` for plots and `LP.diagram({...})` for boxes and arrows, data from `LP.ds`. Write a full module (setup/render) only when no component fits; then follow the figure rules in the live-paper skill. Use a scene when text should follow a figure's steps.
4. **Check loop:** `livepaper check paper.md` in the note folder. Fix every listed problem (column overflows, wide equations, stranded headings, figure labels outside / overlapping / on a line). Then look once at `build/check/sheet.png`; open a single `page-NN.png` or `lint-*.png` only where the sheet or the report points. Repeat until the check passes.
5. **PDF:** `livepaper build paper.md --pdf`, then `grep -c Overfull build/paper.log` must print 0 (split wide equations with `aligned`). Look at two or three PDF pages (`pdftoppm -r 50 -png -f 1 -l 3 dist/paper.pdf build/pdfp`).

`livepaper` is on the PATH (if not: `node <toolkit>/bin/livepaper.mjs`). Heredocs in the Bash tool eat backslashes: write files containing TeX or regexes with the Write tool.

Do not publish, commit, or edit files outside `P\notes\krylov\`, `P\scripts\krylov*.py`, `P\tests\test_krylov.py`, `P\notes\refs.json` and `P\notes\ref-summaries.txt`.

Report back in at most 15 lines: pages; sections with the main result of each; figures (how many chart/diagram specs, how many hand-written modules); tests (count, all passing?); check and overfull status; the open problems (one line each); anything you could not verify, stated plainly.


## Pilot: finish Krylov note (polish)  (2026-11-23T23:33)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

Finish a nearly complete live-paper note: `<nielsen>\pilot\notes\krylov\` (paper.md + sections/*.md + figures/*.js, data in figures/_krylov.json). Another agent wrote it and was cut off while doing its last edits: "insert the figure, convert the table to column width, and fix the algorithm title". The checking script `pilot/scripts/krylov.py` and its 51 tests pass; do not change them unless a number in the text disagrees with them.

This is a cost-measured benchmark: do only what is needed, keep your context small.
- Do NOT open anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\scripts\krylov*`, `...\Nielsen_Geometry\tests\test_krylov.py`.
- Read the live-paper skill `~/.claude\skills\live-paper\SKILL.md` only if you need a construct; do not read whole section files unless the check points into them (use grep and Read with offset/limit).
- `livepaper` is on the PATH (else `node <toolkit>/bin/livepaper.mjs`). Heredocs in the Bash tool eat backslashes: edit TeX/JS with Edit/Write.

Steps:
1. In the note folder run `livepaper check paper.md`. Fix every listed problem (errors, unresolved references, column overflows, wide equations, stranded headings, figure labels outside/overlapping/on a line; for a figure label problem open only the `build/check/lint-<figure>.png` crop). Make sure every figure in figures/ is placed in the text and referenced (the check notes "figures never referenced"), and that any table fits a column or is `.wide`. Repeat until the check passes.
2. Look ONCE at `build/check/sheet.png` (all pages). Open a single page image only if the sheet shows something wrong there. Do not re-read images you have already seen.
3. `livepaper build paper.md --pdf`; `grep -c Overfull build/paper.log` must print 0 (split wide equations with `aligned`). Look at most at two PDF pages (`pdftoppm -r 50 -png -f N -l N dist/paper.pdf build/pdfp`), once each.

Report in at most 10 lines: what you fixed, final check status, pages, overfull count, anything left.


## Pilot2 verify: conjugate points  (2026-11-24T00:06)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are the verification agent for one group of results of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot2`.

Group: **conj** — brief section 2 (conjugate points of e^{-iHt}) and the appendix (how conjugate times are computed).

Read: `P\notes\briefs\krylov.md` (the brief), `P\notes\briefs\krylov-outline.md` (file names, labels, who does what), `P\notes\notation.md`. Nothing else from any note.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\scripts\krylov*`, `...\Nielsen_Geometry\tests\test_krylov*` (other versions of this note: this is a blind benchmark).

Do:
1. For every closed form and number the brief asks for in your group, write a function in `P\scripts\krylov_conj.py` and a test in `P\tests\test_krylov_conj.py` (run `uv run pytest -q pilot2/tests/test_krylov_conj.py` from `<nielsen>`; numpy/scipy available). Use the wolfram-engine skill for a symbolic check when a derivation is not obvious. Keep any single computation under about 10 minutes (n = 5 is optional).
2. The script writes the figure data to `P\notes\krylov\figures\_kconj.json` (becomes `LP.ds.kconj`): conjugate time vs penalty q for the Hamiltonian classes and n.
3. Write `P\notes\krylov\results-conj.md`, the only thing the writers will know: for each result, the statement in final form (TeX, `$...$`), the conventions, the derivation in 3 to 10 lines (the steps the text must show), the test that checks it, tables of numbers the text should quote, the dataset keys for the figure, and a 4-to-8-line algorithm for computing first conjugate times (for the appendix), plus 2 open questions your work raised.

Cost rules: keep context small. Do not print large arrays; do not re-read files you wrote; Read with offset/limit when you need a part. Heredocs in the Bash tool eat backslashes: write files with TeX or regexes using the Write tool. Edit only the three files named above (and their test). Do not commit.

Report in at most 8 lines: results verified, any that failed or changed from the brief's expectations, test count and status.


## Pilot2 verify: Lanczos and spread  (2026-11-24T00:06)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are the verification agent for one group of results of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot2`.

Group: **lanczos** — brief sections 3 (Krylov complexity: Lanczos algorithm, exactly solvable SL(2,R) chain, operator growth hypothesis, Ising-chain b_n), 4 (spread complexity of the infinite-temperature TFD, GUE vs uncorrelated levels, the late-time value for any non-degenerate spectrum) and 5 (Krylov complexity is not a distance on a qubit; squared lengths of straight lines).

Read: `P\notes\briefs\krylov.md` (the brief), `P\notes\briefs\krylov-outline.md` (file names, labels, who does what), `P\notes\notation.md`. Nothing else from any note.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\scripts\krylov*`, `...\Nielsen_Geometry\tests\test_krylov*` (other versions of this note: this is a blind benchmark).

Do:
1. For every closed form and number the brief asks for in your group, write a function in `P\scripts\krylov_lanczos.py` and a test in `P\tests\test_krylov_lanczos.py` (run `uv run pytest -q pilot2/tests/test_krylov_lanczos.py` from `<nielsen>`; numpy/scipy available). Use the wolfram-engine skill for a symbolic check when a derivation is not obvious. Keep any single computation under about 10 minutes.
2. The script writes the figure data to `P\notes\krylov\figures\_klan.json` (becomes `LP.ds.klan`): Lanczos coefficients (two Ising points), spread complexity curves (GUE, uncorrelated; log-spaced times).
3. Write `P\notes\krylov\results-lanczos.md`, the only thing the writers will know: for each result, the statement in final form (TeX, `$...$`), the conventions, the derivation in 3 to 10 lines (the steps the text must show), the test that checks it, numbers the text should quote (matrix sizes, samples, fitted slopes), the dataset keys for each figure, plus 2 open questions your work raised.

Cost rules: keep context small. Do not print large arrays; do not re-read files you wrote; Read with offset/limit when you need a part. Heredocs in the Bash tool eat backslashes: write files with TeX or regexes using the Write tool. Edit only the files named above. Do not commit.

Report in at most 8 lines: results verified, any that failed or changed from the brief's expectations, test count and status.


## Pilot2 verify: chords, Kitaev, open  (2026-11-24T00:06)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are the verification agent for one group of results of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot2`.

Group: **bulk** — brief sections 6 (chord chain of double-scaled SYK: semiclassical length, closed form and late-time velocity, against exact numerics), 7 (Kitaev chain: Gaussian-state complexity per site vs chemical potential, the singular part of its derivative at the critical point with its coefficient) and 8 (Krylov dynamics with dissipation: a damped chain).

Read: `P\notes\briefs\krylov.md` (the brief), `P\notes\briefs\krylov-outline.md` (file names, labels, who does what), `P\notes\notation.md`. Nothing else from any note.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\scripts\krylov*`, `...\Nielsen_Geometry\tests\test_krylov*` (other versions of this note: this is a blind benchmark).

Do:
1. For every closed form and number the brief asks for in your group, write a function in `P\scripts\krylov_bulk.py` and a test in `P\tests\test_krylov_bulk.py` (run `uv run pytest -q pilot2/tests/test_krylov_bulk.py` from `<nielsen>`; numpy/scipy available). Use the wolfram-engine skill for a symbolic check when a derivation is not obvious. Keep any single computation under about 10 minutes.
2. The script writes the figure data to `P\notes\krylov\figures\_kbulk.json` (becomes `LP.ds.kbulk`): chord-chain length vs time (exact and semiclassical), Kitaev complexity and its derivative vs chemical potential, damped-chain Krylov complexity.
3. Write `P\notes\krylov\results-bulk.md`, the only thing the writers will know: for each result, the statement in final form (TeX, `$...$`), the conventions, the derivation in 3 to 10 lines (the steps the text must show), the test that checks it, numbers the text should quote, the dataset keys for each figure, plus 2 open questions your work raised.

Cost rules: keep context small. Do not print large arrays; do not re-read files you wrote; Read with offset/limit when you need a part. Heredocs in the Bash tool eat backslashes: write files with TeX or regexes using the Write tool. Edit only the files named above. Do not commit.

Report in at most 8 lines: results verified, any that failed or changed from the brief's expectations, test count and status.


## Pilot2 write: sections 1-5  (2026-11-24T00:45)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are writer 1 of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot2`; the note is `P\notes\krylov\`.

Read (and nothing else): `P\notes\briefs\krylov.md`, `P\notes\briefs\krylov-outline.md` (who writes which file, labels), `P\notes\notation.md`, `P\notes\common.md` (macros), `P\notes\krylov\results-conj.md`, `P\notes\krylov\results-lanczos.md`, the live-paper skill `~/.claude\skills\live-paper\SKILL.md`, and in `<toolkit>\README.md` only the sections "Authoring" and "Chart and diagram figures" (find them with grep -n "^##\|^###" and read those ranges). For figure data, list the dataset keys with a one-line node or python command; do not print the data. Do not open the scripts beyond `grep -n "^def "`.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\scripts\krylov*` (blind benchmark).

Write:
- `paper.md`: title "Chaos and Krylov Complexity" (or better), subtitle, pagetitle (2 to 4 words), runhead, topics, keywords, an abstract for the whole note (all sections of the brief), `series: ../series.json`, `series-id: krylov`, and `sections:` listing ALL ten files of the outline in order (writer 2 writes 06 to 10 in parallel). Optionally `abstract-steps` with figures/routes.js as an LP.diagram attached to the abstract (`scene=abstract`, `.wide`, placed before the first heading in 01-two.md).
- `sections/01-two.md` to `sections/05-relation.md` with the labels of the outline. Derive the results as the results files lay out them (state conventions, show the steps), plain direct prose, about 6 to 7 of the note's 10 to 14 pages. Quote numbers exactly as the results files give them. Link background with `[text](note:primer#sec-jacobi)` etc. (anchors in the brief). Cite only keys from `livepaper bib keys P/notes/refs.json`. Cross-reference writer 2's parts by their outline labels (`@sec:chords`, `@sec:app-conj`).
- Figures `figures/conj.js`, `figures/lanczos.js`, `figures/spread.js` (and routes.js if used) as `export default LP.chart({...})` / `LP.diagram({...})` on `LP.ds.kconj` / `LP.ds.klan`, each placed in your sections as `::: {.figure #fig:x live="figures/x.js"}` with a caption, and referenced in the text. Use scenes where text should follow a figure's steps.

Then build once: `livepaper build paper.md` in the note folder (`livepaper` on the PATH, else `node <toolkit>/bin/livepaper.mjs`). Missing section files of writer 2 make the build fail: if 06-10 do not exist yet, create each as an empty placeholder containing only its heading line with its label (writer 2 will overwrite them), and do not edit them otherwise. Fix errors in YOUR files (KaTeX errors, missing figures, unresolved references to your own labels). Leave layout to the polish agent.

Cost rules: write each file once with the Write tool and fix with Edit; do not re-read files you wrote; do not look at images. Heredocs in the Bash tool eat backslashes. Edit only paper.md, sections 01-05 and your figure files. Do not commit.

Report in at most 8 lines: sections and their main result, figures, references to labels you expect from writer 2.


## Pilot2 write: sections 6-10  (2026-11-24T00:45)

Options: `{"subagent_type": "general-purpose", "run_in_background": "true"}`

You are writer 2 of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot2`; the note is `P\notes\krylov\`.

Read (and nothing else): `P\notes\briefs\krylov.md`, `P\notes\briefs\krylov-outline.md` (who writes which file, labels), `P\notes\notation.md`, `P\notes\common.md` (macros), `P\notes\krylov\results-bulk.md`, `P\notes\krylov\results-conj.md` (for the appendix and open problems), the open-questions part of `P\notes\krylov\results-lanczos.md` (grep for it), the live-paper skill `~/.claude\skills\live-paper\SKILL.md`, and in `<toolkit>\README.md` only the sections "Authoring" and "Chart and diagram figures" (find them with grep -n "^##\|^###" and read those ranges). For figure data, list the dataset keys with a one-line node or python command; do not print the data. Do not open the scripts beyond `grep -n "^def "`.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\scripts\krylov*` (blind benchmark).

Write `sections/06-chords.md`, `07-kitaev.md`, `08-open.md`, `09-problems.md`, `10-appendix.md` with the outline's labels (the appendix heading carries `{.appendix #sec:app-conj}`); writer 1 writes paper.md and sections 01-05 in parallel (they may have created empty placeholders for your files: overwrite them). Derive the results as the results files lay out them (conventions, steps), plain direct prose, about 5 to 6 of the note's 10 to 14 pages. "Open problems": 5 to 7 problems drawn from all three results files and the brief, each with the question, what is known, and a next step. The appendix: how first conjugate times are computed, as an `::: {.algorithm #alg:conj title="..."}` block (first item `1. **Input:** ...`) with a short explanation. Quote numbers exactly as the results files give them. Cite only keys from `livepaper bib keys P/notes/refs.json`. Cross-reference writer 1's parts by their outline labels (`@sec:conj`, `@sec:spread`, ...).
Figures `figures/chord.js`, `figures/kitaev.js`, `figures/damped.js` as `export default LP.chart({...})` on `LP.ds.kbulk`, each placed in your sections as `::: {.figure #fig:x live="figures/x.js"}` with a caption, and referenced in the text.

Then, once `P\notes\krylov\paper.md` lists all ten section files (wait for writer 1 if needed: check every minute or so, at most 20 minutes, with a cheap `grep -c sections/ paper.md`), build: `livepaper build paper.md` in the note folder (`livepaper` on the PATH, else `node <toolkit>/bin/livepaper.mjs`). Fix errors in YOUR files (KaTeX errors, missing figures, unresolved references to your own labels). Leave layout to the polish agent.

Cost rules: write each file once with the Write tool and fix with Edit; do not re-read files you wrote; do not look at images. Heredocs in the Bash tool eat backslashes. Edit only sections 06-10 and your figure files. Do not commit.

Report in at most 8 lines: sections and their main result, figures, open problems (one line each).


## Pilot2 polish: check and PDF  (2026-11-24T01:01)

Options: `{"subagent_type": "general-purpose", "model": "sonnet", "run_in_background": "true"}`

Check and polish a finished live-paper note, in a cost-measured benchmark: `<nielsen>\pilot2\notes\krylov\` (paper.md, sections/*.md, figures/*.js with data figures/_kconj.json, _klan.json, _kbulk.json). Two writers wrote it in parallel; it builds. Do not change results, numbers or citations; fix layout and presentation only.

Keep context small: do not read whole section files; use grep and Read with offset/limit where the check points. Never open anything under `...\Nielsen_Geometry\notes\krylov\` or `...\Nielsen_Geometry\pilot\`. `livepaper` is on the PATH (else `node <toolkit>/bin/livepaper.mjs`). Heredocs in the Bash tool eat backslashes: edit TeX/JS with the Edit tool.

1. In the note folder run `livepaper check paper.md`. Fix every listed problem: errors, unresolved references, column overflows, equations or blocks wider than the column (split equations with `aligned`; make a wide table `.wide`), stranded headings, and figure labels outside/overlapping/on a line (for those open only `build/check/lint-<figure>.png`, once). Every figure must be referenced in the text (a figure attached to the abstract excepted). Repeat until the check passes.
2. Look ONCE at `build/check/sheet.png` (all pages). Open a single page image only if the sheet shows something wrong there.
3. `livepaper build paper.md --pdf`; `grep -c Overfull build/paper.log` must print 0 (split wide equations with `aligned`; give table separators proportional widths, e.g. `|:----|:--|---:|`). Look at most at two PDF pages (`pdftoppm -r 50 -png -f N -l N dist/paper.pdf build/pdfp`), once each.

Edit only files inside that note folder. Do not commit.

Report in at most 10 lines: fixes, final check status, HTML pages, PDF pages, overfull count, anything left.


## Pilot2 polish: check and PDF  (2026-11-24T10:50)

Options: `{"model": "sonnet"}`

Check and polish a finished live-paper note, in a cost-measured benchmark: `<nielsen>\pilot2\notes\krylov\` (paper.md, sections/*.md, figures/*.js with data figures/_kconj.json, _klan.json, _kbulk.json). Two writers wrote it in parallel; it builds. Do not change results, numbers or citations; fix layout and presentation only.

Keep context small: do not read whole section files; use grep and Read with offset/limit where the check points. Never open anything under `...\Nielsen_Geometry\notes\krylov\` or `...\Nielsen_Geometry\pilot\`. `livepaper` is on the PATH (else `node <toolkit>/bin/livepaper.mjs`). Heredocs in the Bash tool eat backslashes: edit TeX/JS with the Edit tool.

1. In the note folder run `livepaper check paper.md`. Fix every listed problem: errors, unresolved references, column overflows, equations or blocks wider than the column (split equations with `aligned`; make a wide table `.wide`), stranded headings, and figure labels outside/overlapping/on a line (for those open only `build/check/lint-<figure>.png`, once). Every figure must be referenced in the text (a figure attached to the abstract excepted). Repeat until the check passes.
2. Look ONCE at `build/check/sheet.png` (all pages). Open a single page image only if the sheet shows something wrong there.
3. `livepaper build paper.md --pdf`; `grep -c Overfull build/paper.log` must print 0 (split wide equations with `aligned`; give table separators proportional widths, e.g. `|:----|:--|---:|`). Look at most at two PDF pages (`pdftoppm -r 50 -png -f N -l N dist/paper.pdf build/pdfp`), once each.

Edit only files inside that note folder. Do not commit.

Report in at most 10 lines: fixes, final check status, HTML pages, PDF pages, overfull count, anything left.


## Pilot3 write Kitaev (default effort)  (2026-11-24T11:11)

Options: `{}`

You are the writer of one section of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot3\default`; the note is `P\notes\krylov\`. All other sections are written; yours is missing.

Read (and nothing else): `P\notes\briefs\krylov.md`, the row for `07-kitaev.md` and the figure list in `P\notes\briefs\krylov-outline.md` (grep -n), `P\notes\notation.md`, `P\notes\common.md` (macros), in `P\notes\krylov\results-bulk.md` only the part "## 7. Kitaev chain across the transition" up to the next "## " heading (find line numbers with grep -n "^## "), the live-paper skill `~/.claude\skills\live-paper\SKILL.md`, and in `<toolkit>\README.md` only the sections "Authoring" and "Chart and diagram figures" (find them with grep -n "^##\|^###" and read those ranges). For figure data, list the dataset keys of `P\notes\krylov\figures\_kbulk.json` with a one-line node or python command; do not print the data. Do not open the scripts beyond `grep -n "^def "`.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\pilot2\`, `...\Nielsen_Geometry\pilot3\low\`, `...\Nielsen_Geometry\scripts\krylov*` (blind benchmark). Do not read the other section files; `grep -n "^#" P/notes/krylov/sections/*.md` shows their headings and labels if you need to cross-reference them.

Write `sections/07-kitaev.md`: heading `# Complexity across a phase transition {#sec:kitaev}`. Derive the results as the results file lays them out (conventions, steps), plain direct prose, about 850 words (about 1.5 of the note's pages). Quote numbers exactly as the results file gives them. Cite only keys from `livepaper bib keys P/notes/refs.json`. Cross-reference other sections by their outline labels (`@sec:conj`, `@sec:spread`, ...).
Figure `figures/kitaev.js` as `export default LP.chart({...})` on `LP.ds.kbulk`, placed in your section as `::: {.figure #fig:kitaev live="figures/kitaev.js"}` with a caption, and referenced in the text.

Then build: `livepaper build paper.md` in the note folder (`livepaper` on the PATH, else `node <toolkit>/bin/livepaper.mjs`). Fix errors in YOUR files (KaTeX errors, missing figures, unresolved references to your own labels). Leave layout alone.

Cost rules: write each file once with the Write tool and fix with Edit; do not re-read files you wrote; do not look at images. Heredocs in the Bash tool eat backslashes. Edit only `sections/07-kitaev.md` and `figures/kitaev.js`. Do not commit.

Report in at most 5 lines: the section's main results, the figure, build status.


## Pilot3 write Kitaev (low effort)  (2026-11-24T11:11)

Options: `{"effort": "low"}`

You are the writer of one section of a live-paper note, in a cost-measured benchmark. Project root P = `<nielsen>\pilot3\low`; the note is `P\notes\krylov\`. All other sections are written; yours is missing.

Read (and nothing else): `P\notes\briefs\krylov.md`, the row for `07-kitaev.md` and the figure list in `P\notes\briefs\krylov-outline.md` (grep -n), `P\notes\notation.md`, `P\notes\common.md` (macros), in `P\notes\krylov\results-bulk.md` only the part "## 7. Kitaev chain across the transition" up to the next "## " heading (find line numbers with grep -n "^## "), the live-paper skill `~/.claude\skills\live-paper\SKILL.md`, and in `<toolkit>\README.md` only the sections "Authoring" and "Chart and diagram figures" (find them with grep -n "^##\|^###" and read those ranges). For figure data, list the dataset keys of `P\notes\krylov\figures\_kbulk.json` with a one-line node or python command; do not print the data. Do not open the scripts beyond `grep -n "^def "`.
Never open: anything under `...\Nielsen_Geometry\notes\krylov\`, `...\Nielsen_Geometry\pilot\`, `...\Nielsen_Geometry\pilot2\`, `...\Nielsen_Geometry\pilot3\default\`, `...\Nielsen_Geometry\scripts\krylov*` (blind benchmark). Do not read the other section files; `grep -n "^#" P/notes/krylov/sections/*.md` shows their headings and labels if you need to cross-reference them.

Write `sections/07-kitaev.md`: heading `# Complexity across a phase transition {#sec:kitaev}`. Derive the results as the results file lays them out (conventions, steps), plain direct prose, about 850 words (about 1.5 of the note's pages). Quote numbers exactly as the results file gives them. Cite only keys from `livepaper bib keys P/notes/refs.json`. Cross-reference other sections by their outline labels (`@sec:conj`, `@sec:spread`, ...).
Figure `figures/kitaev.js` as `export default LP.chart({...})` on `LP.ds.kbulk`, placed in your section as `::: {.figure #fig:kitaev live="figures/kitaev.js"}` with a caption, and referenced in the text.

Then build: `livepaper build paper.md` in the note folder (`livepaper` on the PATH, else `node <toolkit>/bin/livepaper.mjs`). Fix errors in YOUR files (KaTeX errors, missing figures, unresolved references to your own labels). Leave layout alone.

Cost rules: write each file once with the Write tool and fix with Edit; do not re-read files you wrote; do not look at images. Heredocs in the Bash tool eat backslashes. Edit only `sections/07-kitaev.md` and `figures/kitaev.js`. Do not commit.

Report in at most 5 lines: the section's main results, the figure, build status.


## Blind judge: three Kitaev drafts  (2026-11-24T11:16)

Options: `{}`

You are judging, blind, three drafts of the same section of a physics note (a "live paper" on Krylov and Nielsen complexity). All files are in `<scratchpad>\judge\`:
- `results.md`: the verified results the writers were given (statements, conventions, derivation steps, tests). This is ground truth.
- `A.md`, `B.md`, `C.md`: the three drafts (Pandoc Markdown with TeX; `@eq:`/`@sec:`/`@fig:` are cross-references, `[@key]` citations).
- `A.js`, `B.js`, `C.js`: each draft's figure spec (a chart drawn from a dataset of the same results).
- `macros.md`: the TeX macros the drafts use.
Read only these files, each once, all in as few calls as possible. Do not run code. The brief asked for about 850 words deriving the results "as the results file lays them out (conventions, steps), plain direct prose", numbers quoted exactly.

For each draft, check against results.md:
1. Correctness: any formula, sign, factor, branch, value or claim that is wrong, contradicts results.md, or goes beyond it without support. Check the derivations line by line.
2. Completeness: which results and derivation steps of results.md are present, which are missing or only asserted.
3. Exposition: is it clear and well motivated for a physicist reading the note; does the text guide the reader through the steps; is the figure spec sensible and described correctly in the text.
Score each draft 1-10 on correctness, completeness, exposition, and give an overall rank.

Report in at most 18 lines: per draft the scores and the concrete errors or gaps (with the formula or sentence), then the ranking and one line on how large the quality differences are (negligible / noticeable / large).
