# livepaper

Write one Pandoc-Markdown file and get two things from it:

- **a live paper**: a single self-contained HTML file. It is laid out as printed two-column journal sheets (900×1200) with page navigation. Figures are small JS modules that animate step by step, and highlighted phrases, equation terms, table rows and algorithm lines follow the active figure. Readers can play, step, scrub, change speed, zoom, reflow to one column (the default on phones), switch dark mode and hover over references.
- **a LaTeX PDF** in a matching two-column style. Each live figure is frozen at its snapshot step as a vector PDF.

The look follows a hand-made "animated paper" built in November 2026; this repository turns it into a reusable tool.

## Install

Requirements: Node ≥ 20, pandoc ≥ 3.1, a Chromium-family browser (Edge or Chrome, used headless for snapshots and checks), and for PDFs a TeX distribution with `latexmk` (MiKTeX or TeX Live).

```sh
npm install                # in this folder: katex, playwright-core
npm install -g .           # puts `livepaper` on the PATH (symlinked to this folder)
```

If the browser is not found, set `LIVEPAPER_BROWSER` to the path of `msedge`/`chrome`.

## Commands

| Command | What it does |
|:--|:--|
| `livepaper new <dir>` | scaffold a paper from `examples/demo` |
| `livepaper dev [paper.md]` | rebuild on save, live-reload at http://127.0.0.1:4173 |
| `livepaper build [paper.md]` | write `dist/index.html` (standalone) and `dist/artifact.html` (fragment for claude.ai) |
| `livepaper build --pdf` | also snapshot figures to `build/snap/*.pdf` and compile `dist/paper.pdf` |
| `livepaper check [paper.md]` | headless check (see below); exits 1 on problems |
| `livepaper snap` | re-render figure snapshots only |

Options: `--out <dir>`, `--no-webfonts`, `--port <n>`, `--pages 1,3` (check only).

`check` loads the built page in a headless browser and reports:

- console and runtime errors, and KaTeX errors;
- unresolved references and missing figure modules;
- blocks or equations wider than a column, and columns that overflow, measured live after layout;
- headings stranded at a column bottom;
- sideways scrolling at phone width.

It writes `build/check/page-NN.png`, `mobile-dark.png` and `report.json`, then plays every scene, moves every slider, and switches mode and theme to catch interaction errors. Look at the PNGs: they are the fastest way to judge a layout.

## Authoring

### Front matter

```yaml
---
title: "Complexity as [Distance]{.inv}"   # [..]{.inv} draws the inverted title word
subtitle: "..."
author: "Name"
date: "2026"
pagetitle: "Short Page Name"               # browser tab / gallery name, 2–4 words
runhead: "Running head, left"
topics: "running head, right (page 1)"
footer-right: "..."
keywords: [a, b, c]
abstract: |
  Text with [phrases]{.s1} that follow the first figure [step by step]{.s2}.
abstract-steps: "step one|step two"        # makes the abstract a scene
macros:                                     # shared by KaTeX and LaTeX
  ket: '\left|#1\right\rangle'              # single quotes: TeX verbatim
bibliography: refs.json                     # CSL-JSON or BibTeX
sections:                                   # optional: split a long paper into files
  - sections/01-intro.md
---
```

### Blocks

| Construct | Syntax |
|:--|:--|
| numbered equation | `$$ ... $$ {#eq:name}`; use `aligned` for multi-line |
| section label | `# Title {#sec:name}`; `{.unnumbered}`; first appendix heading gets `{.appendix}` |
| reference | `@eq:x` → (3), `@sec:x` → Sec. 2, `@fig:x`, `@tbl:x`, `@alg:x`, `@thm:x`; `-@eq:x` → bare number |
| citation | `[@key]`, `[@a; @b]` (IEEE numeric style) |
| theorem-like | `::: {.theorem #thm:x title="Name"}` … `:::` (also lemma, proposition, corollary, definition, conjecture, example, claim, fact, remark) |
| proof | `::: proof` … `:::` |
| exercise | `::: {.exercise #ex:x title="Name"}` … `::: solution` … `:::` … `:::`. Exercises have their own counter (Exercise 1, 2, …; `@ex:x`). In HTML the solution is hidden behind a *Solution* button that opens it in the tooltip panel (click, tap, Escape or a second click closes it); in the PDF all solutions are collected in a *Solutions* section at the end, after the references, linked both ways. A long exercise title followed directly by a list can overflow the theorem head in LaTeX; start such an exercise with a sentence. |
| live figure | `::: {.figure #fig:x live="figures/x.js" .wide snap=3}` + caption paragraph + `:::` (`.wide` spans both columns, `.full` gets its own page) |
| static figure | `![Caption](img.png){#fig:x}` (PNG/JPG/PDF for LaTeX) |
| table | `::: {.table #tbl:x .wide}` + pipe table + `Table: caption` + `:::` |
| algorithm | `::: {.algorithm #alg:x title="..."}` + ordered list (nested lists indent; lines starting `Input:`/`Output:` are unnumbered) |
| boxes | `::: takeaway` (big italic), `::: {.box title="Note"}` |
| footnote | `text.[^n]` and `[^n]: note` (set at the foot of the column) |

### Reference notes

A CSL-JSON bibliography item may carry two extra fields:

- `"x-summary"`: a short summary, at most two or three lines (Pandoc Markdown, `$...$` math allowed). It is printed in small italics under the entry, in the HTML and in the PDF.
- `"abstract"`: the full abstract (Pandoc Markdown). In the HTML it is shown as a tooltip when the reader hovers over or taps the entry. Entries with a summary but no abstract show "No abstract is published for this work."

Hovering a citation `[n]` in the text shows the entry together with its summary. On a touch screen, which has no hover, the first tap on a citation, cross-reference or footnote mark shows the same preview, and tapping the preview (or the link again) goes there. A tap on an entry opens or closes its abstract, and a tap elsewhere or scrolling closes it. Hover reacts only to pointer events of type `mouse`, because a tap also sends emulated mouse events; the test `tooltips: taps on a touch screen…` guards this. The filter `filters/refnotes.lua` runs after `--citeproc` and does nothing for items without these fields. Escape Markdown in abstracts taken from arXiv, keeping only `$...$` live; the Nielsen project's `scripts/make_bib.py` (`md_abstract`) shows one way.

### Scenes: text that follows a figure

```markdown
::: {.scene #sc:proof steps="project|split|count" dur=2.6}
Text with [a phrase]{.s1}, [another]{.s2-3}, and math $\htmlClass{s2}{a+b}$.

::: {.figure #fig:x live="figures/x.js"}
Caption with [highlighted words]{.s3}.
:::
:::
```

Everything inside the scene shares one clock. `.sN` lights up at step N and `.sN-M` from step N to M. In tables, a step span in the first cell highlights the whole row. In algorithms, a step span highlights its line. A figure can join a scene declared elsewhere with `scene=abstract`. A figure outside any scene uses its module's own `steps`, and step spans in its caption follow them.

Only the scene most visible on screen plays. All others show their rest frame (the snapshot step, with no highlights), so the page is complete without animation and prints cleanly.

### Figure modules

```js
// figures/x.js — plain JS, no imports; shared helpers can go in figures/_lib.js (loaded first)
export default {
  viewBox: [0, 0, 760, 400],   // column figures ~760 wide (2× the 380 px column), wide ~1576, labels 15–20 units
  steps: ['a', 'b', 'c'],      // only if the figure is not inside a scene
  dur: 2.4,                    // seconds per step
  snap: 3,                     // step shown at rest and in the PDF (1-based)
  animate: true,               // continuous animation without steps (f.frac cycles 0→1 every dur)
  params: [{ id: 'q', label: 'penalty q', min: 1, max: 100, value: 10, scale: 'log' }],
  setup(svg, kit, P) { /* build the drawing once; return a state object */ },
  render(state, f) {
    // f.step (1-based), f.k (0-based), f.frac (0..1 within the step), f.n, f.rest, f.P (param values)
  },
};
```

Write `render` so that everything is a function of `f`. Steps before the current one are complete, the current one is at `f.frac`, later ones have not started. When `f.rest` is true, draw the finished snapshot.

`kit` (second argument of `setup`, also `window.LP.kit`):

| Helper | Use |
|:--|:--|
| `el(tag, attrs, parent)`, `set(el, attrs)`, `g`, `path`, `line`, `circle`, `rect`, `text(parent, x, y, str, {anchor, size, cls, weight, italic})` | SVG primitives |
| `tex(parent, x, y, tex, {size, anchor, valign})` → item with `.set(tex, x, y)` | KaTeX labels (foreignObject) |
| `arrow(svg)` → `'url(#id)'` | arrowhead marker |
| `box(parent, x, y, w, h)` | box with hard shadow (harness style) |
| `axes(parent, {x, y, w, h, xr, yr, xticks, yticks, xlabel, ylabel, grid})` → `{X, Y}` | plot axes; `$...$` labels use KaTeX |
| `plot(parent, ax, points)`, `poly(points, close)` | polylines |
| `sphere(cx, cy, R, yaw, pitch)` → `{project, circle, split}` | orthographic sphere with front/back splitting |
| `ease`, `easeOut`, `lerp`, `clamp`, `seg`, `linspace`, `rng`, `fmt` | numbers and motion |

Colours come from CSS classes, so figures follow the theme. Strokes: `ink`, `smid`, `ssoft`, `sfaint`. Fills: `fink`, `fpaper`, `fbox`, `fband`, `fsoft`, `fmid`, `nofill`. Text: `mid`, `soft`, `paper`, `serif`, `it`. `window.LP.jump(id)` scrolls to an element of the paper, which is useful for clickable maps.

### URL switches (local files)

`?static` (no animation), `?mode=reflow|paper`, `?theme=light|dark`, `?bare` (no toolbar), `?scene=sc-x&step=2` (freeze), `?fig=<module>&step=3` (one figure alone, used for snapshots). Plain `#ids` (e.g. `#sec-intro`, `#eq-ea`) work everywhere.

## Series of notes

Several papers can form a series, for example an overview plus deep companion notes. List them in a shared registry:

```json
{ "title": "My notes",
  "notes": { "overview":   { "title": "Overview",   "dir": "overview",   "url": "https://claude.ai/artifact/..." },
             "holography": { "title": "Holography", "dir": "holography", "url": null } } }
```

Each paper then joins it in its front matter with `series: ../series.json` and `series-id: holography`. The series gives you three things:

- **Links between notes.** Write `[text](note:holography#sec-cv)`. In `dist/index.html` the link goes to the other note's local `dist/index.html`. In `dist/artifact.html` and in the PDF it goes to the published `url`. Notes without a URL yet are shown as plain text.
- **A Notes menu** in the toolbar, listing every note in the series. The current note is marked, and planned notes are greyed out.
- **Links from figures.** `LP.noteHref(id, anchor)` returns the right link for the current build, or `null`. Wrap a node in `kit.link(parent, href)` to make it clickable; links to other notes open in a new tab.

Workflow for a new note:

1. Add it to the registry with `"url": null`.
2. Build and publish it.
3. Put the URL it was published at into the registry.
4. Rebuild and republish the notes that link to it.

## Publishing on claude.ai

Publish `dist/artifact.html`: it has no document skeleton, and fonts, KaTeX and scripts are inlined, so nothing is fetched. Printing is disabled inside the claude.ai frame, so the Print button only appears when the page is opened as a local file.

## How it works

- `filters/livepaper.lua`, one Pandoc filter for both outputs, does three jobs:
  - it numbers sections, equations, figures, tables, algorithms and environments, and resolves references;
  - it turns fenced divs into HTML structures or LaTeX environments;
  - it tags scene elements, and collects scenes, macros and labels into a JSON block;
  - in HTML it binds inline math to the punctuation after it (`span.lp-nb`, no wrap), because browsers may break a line after the inline-blocks KaTeX produces.
- A wide figure joins the band at the top of a page only while that page's columns are empty. A wide figure meant to sit under the abstract (`scene=abstract`) must therefore come before the first heading.
- `src/build.mjs` runs pandoc and prerenders all math with KaTeX. It inlines CSS, fonts, runtime and figure modules into one file, and drives `latexmk`.
- `runtime/paginate.js` flows the article into fixed sheets. Paragraphs split at word boundaries (KaTeX stays atomic), and lists, environments and reference lists split between items. Figures, tables and algorithms float to the next column. Wide items go to a band at the top of the next page, full figures get their own page, and footnotes go to the foot of their column. Columns are absolutely positioned with CSS containment, so each measurement only re-lays-out one column: a 14-page paper paginates in about 0.2 s. Pages are typeset at the zoom they are shown at, because text breaks into lines slightly differently at other zooms; a resize or zoom change that makes a column overflow typesets again, and printing typesets at zoom 1.
- `runtime/player.js` gives each scene its own clock; `runtime/ui.js` handles the toolbar, zoom, modes, theme, links, tooltips and the report used by `check`.

## Tests

`npm test` runs four groups of checks:

- filter output for both formats;
- the build (single file, fragment, inlining, KaTeX);
- headless layout of the demo, including phone width and interaction;
- splitting of long paragraphs across columns and pages.

License: MIT. `csl/ieee.csl` is from the Citation Style Language project (CC BY-SA 3.0).
