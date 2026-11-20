---
name: live-paper
description: Write a "live paper", an interactive, paged, two-column scientific note in the monochrome journal style (animated figures synced to highlighted text, reader controls, reflow on phones, dark mode), together with a matching LaTeX PDF, from one Pandoc-Markdown source using the livepaper toolkit. Use when the user asks for a note, review, explainer, paper reconstruction or report "in the live paper style", an "animated paper", "interactive version" plus LaTeX/PDF, or wants an existing note turned into one.
---

# Live paper

The toolkit lives at `C:\Users\qrzys\Documents\Projects\Papers_animated` (README.md there is the full reference). Its CLI is `livepaper`. If that is not on the PATH, run `node C:/Users/qrzys/Documents/Projects/Papers_animated/bin/livepaper.mjs` instead. The first complete example is the Nielsen geometric-complexity review in `C:\Users\qrzys\Documents\Projects\Research\Nielsen_Geometry\notes\nielsen-review`: copy patterns from it, especially figures/*.js.

## Workflow

1. **Scaffold** in the user's project, e.g. `notes/<topic>/`: run `livepaper new notes/<topic>`. This gives `paper.md`, `refs.bib` and `figures/`. For long notes, list section files under `sections:` in the front matter.
2. **Get the facts right first.**
   - Derive or check every formula you state. Use the wolfram-engine skill and small Python or pytest scripts in the project, and keep them as `scripts/` with tests.
   - Verify every reference against arXiv or INSPIRE metadata before citing it. The arXiv API takes `id_list` batches; the Nielsen project's `scripts/arxiv_meta.py`, `inspire_venues.py` and `make_bib.py` do this and emit CSL-JSON.
   - Do not cite from memory.
3. **Write the text** in Pandoc Markdown with the constructs below. Plain, direct prose.
4. **Write the figure modules**, one per live figure. Use a scene whenever text should follow a figure.
5. **Build and check:** `livepaper check paper.md`. Fix every reported problem, then **look at** `build/check/page-NN.png` and `mobile-dark.png` with the Read tool. Look for overlapping labels, figures cut off, empty-looking pages, and headings far from their content. Repeat until clean.
6. **PDF:** `livepaper build paper.md --pdf`, then render pages with `pdftoppm -r 60 -png dist/paper.pdf build/pdfp` and look at a few. Fix overfull equations by splitting them with `aligned`; LaTeX columns are narrower than the HTML ones.
7. **Publish** `dist/artifact.html` with the Artifact tool. It is a fragment with no doctype, already artifact-compliant: theme tokens, dark mode, reflow at phone width, and everything inlined. Give the user the link and the paths to `dist/index.html` (offline) and `dist/paper.pdf`.

## Series (overview + companion notes)

When notes belong together, keep a registry `notes/series.json`: `{title, notes: {id: {title, dir, url}}}`. Each paper joins it with `series: ../series.json` and `series-id: <id>` in its front matter. A shared `bibliography: ../refs.json` works well, because citeproc lists only the entries each note cites. Give each CSL-JSON item an `"x-summary"` (two or three lines, written from the abstract) and an `"abstract"`: the summary is printed under the entry and the abstract appears as a tooltip (README, "Reference notes").

- Link between notes with `[text](note:<id>#sec-x)`. This resolves to the local file in `index.html` and to the published URL in `artifact.html` and the PDF; a note that is not yet published is shown as plain text.
- In figures, `LP.noteHref(id, anchor)` and `kit.link(parent, href)` make clickable nodes, as in the clickable map of the Nielsen overview.
- After publishing a new note:
  1. put its URL into the registry;
  2. rebuild the notes that link to it;
  3. republish them to the same artifact paths.

  A shared artifact may need the user's confirmation before you update it.

## Constructs (cheat sheet)

- Equations: `$$ ... $$ {#eq:x}` (numbered) and `@eq:x`. Sections: `# T {#sec:x}`, with `{.appendix}` on the first appendix heading only.
- Refs: `@sec:x @fig:x @tbl:x @alg:x @thm:x`. Citations: `[@key]`.
- `::: {.theorem #thm:x title="..."}` (lemma, proposition, corollary, definition, example, remark), `::: proof`, `::: takeaway`, `::: {.box title=".."}`.
- Exercises: `::: {.exercise #ex:x title=".."}` with a nested `::: solution` (hidden behind a button in HTML, collected at the end of the PDF). Own counter; `@ex:x`.
- `::: {.figure #fig:x live="figures/x.js" .wide snap=3}` with the caption inside. `.wide` spans both columns, `.full` gets its own page, and `scene=abstract` attaches the figure to the abstract's scene.
- `::: {.table #tbl:x .wide}` with a pipe table and a `Table: caption` line. `::: {.algorithm #alg:x title=".."}` with an ordered list.
- Scenes: `::: {.scene #sc:x steps="a|b|c" dur=2.6}` … `:::`. Inside: `[text]{.s2}`, `[text]{.s2-4}`, `$\htmlClass{s2}{...}$`. Front matter `abstract-steps: "a|b|c"` makes the abstract a scene.

## Figure rules

- `export default { viewBox, steps?, dur?, snap?, animate?, params?, setup(svg, kit, P), render(state, f) }`. Plain JS, no imports.
- Everything in `render` is a function of `f`: `f.step` (1-based), `f.frac`, `f.rest`, `f.P`. A useful helper is `const at = s => f.step > s ? 1 : f.step === s ? kit.ease(f.frac) : 0`. At rest, draw the finished state: it is what the PDF and non-active readers see.
- Column figures use a viewBox about **760** wide, wide ones about **1576**, with text sizes of 15–20 units. Keep labels inside the viewBox and away from curves. Use `kit.tex` for math labels.
- Colours only through classes (`ink fink fpaper fbox fband smid ssoft sfaint`, text `mid soft paper`), never hex values, so dark mode works.
- Interactive parameters go in `params` (sliders or selects under the figure). Use real formulas, ideally the same ones the project's scripts verify.

## Pitfalls already met

- Heredocs in the Bash tool eat backslashes, so write files containing TeX with the Write tool.
- A wide equation in the PDF shows up as an overfull hbox. Split it with `aligned`.
- Figure step spans in captions only work if the figure has steps, from a scene or from the module.
- `latexmk` errors: look at `build/paper.log`. `amsthm` must load before `newtxmath`; the template already does this. The build prints only the first few overfull boxes: `grep -c Overfull build/paper.log` must be 0.
- `@eq:x` prints "(3)"; `[-@eq:x]` prints a bare "3", which reads badly after a noun ("the trace form 1"). Use `@eq:x` in running text.
- Algorithm blocks render only numbered list items: write `1. **Input:** …` as the first item, not a bare `Input:` line, or the box comes out empty.
- In figure modules, `kit.tex` returns `{fo, set}` (use `item.fo` for opacity), and JavaScript has `Math.LN2`/`Math.LN10` but no `Math.LN3`. A NaN attribute shows up in `check` as a console error.
- A figure with `scene=abstract` should sit in the first section, so it appears next to the abstract it animates with. If it is `.wide`, put it before the first heading: a wide figure joins the top band of a page only while the page's columns are empty, otherwise it moves to the next page.
- Exercises: a long title followed directly by a list overflows the theorem head in the PDF, so start the exercise with a sentence. Hidden solutions are typeset in the PDF's narrow columns, so split their wide equations with `aligned` too; `grep -c Overfull build/paper.log` covers them.
- After every figure change, look at the rest frame for labels that touch curves or points; place labels at free curve ends or in a legend in an empty corner.
