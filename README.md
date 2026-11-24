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
| `livepaper devices [paper.md]` | phone and tablet profiles in WebKit (the engine of every iOS browser) or Chromium: layout, sideways scrolling, taps |
| `livepaper bib add\|todo\|summaries\|keys <refs.json> …` | verified bibliography entries from arXiv, Crossref and INSPIRE (see "Bibliography") |
| `livepaper series new\|status\|build\|published …` | scaffold a series, see which notes to rebuild or republish (see "Series of notes") |

Options: `--out <dir>`, `--no-webfonts`, `--port <n>`, `--pages 1,3` (check only), `--engine chromium` and `--device "iPad Mini,iPhone 13"` (devices only).

`check` loads the built page in a headless browser and reports:

- console and runtime errors, and KaTeX errors;
- unresolved references and missing figure modules;
- blocks or equations wider than a column, and columns that overflow, measured live after layout;
- headings stranded at a column bottom;
- sideways scrolling at phone width;
- figure labels (in the rest frame) that stick out of the viewBox, overlap another label, or sit on a drawn line or data point. A line hidden under a filled shape painted later (a gate box over its wire) does not count. A figure opts out with `lint: false`, an element with `data-lint="off"`;
- as notes, not failures: sparse pages, figures placed more than a page after their first mention, figures never referenced.

It writes `build/check/sheet.png` (every page on one image, pages with problems outlined in red), `page-NN.png`, `lint-<figure>.png` (a sharp crop of each flagged figure with the labels in question boxed), `mobile-dark.png` and `report.json`, then plays every scene, moves every slider, and switches mode and theme to catch interaction errors. Look at `sheet.png` first and open single pages only where it points: one contact sheet costs about a tenth of the page images.

`devices` builds the paper and loads it with the profiles iPad Pro 11 (portrait and landscape), iPad Mini, iPhone 13 and iPhone SE. For each it reports the mode chosen, columns that overflow, sideways scrolling and runtime errors, and taps a citation (preview, then follow), a reference entry (abstract), a solution button and Play. WebKit comes from `npx playwright-core install webkit` in this folder (or set `LIVEPAPER_WEBKIT` to its executable); emulation uses the same engine as Safari on iOS but is not a real device.

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

### Chart and diagram figures

Most figures are plots of computed data or boxes and arrows. For these a module can be a spec instead of code:
`LP.chart(spec)` and `LP.diagram(spec)` return an ordinary figure definition, with steps, snapshot step, theme
classes and the label rules built in.

**Data files.** A file `figures/_<name>.json` next to the figure modules is inlined by the build as `LP.ds.<name>`.
Let the script that verifies the note's numbers write it, so text, tests and figures share one source.

```js
// figures/spread.js
export default LP.chart({
  steps: ['ramp', 'peak', 'slope and plateau', 'uncorrelated levels'], snap: 4,
  data: 'kry.spread',                                  // default dataset: LP.ds.kry.spread
  x: { range: [0.3, 3000], log: true, ticks: [1, 10, 100, 1000], label: 'time t' },
  y: { range: [0, 0.7], label: 'K(t) / N' },           // ticks: nice ones if omitted
  hlines: [{ y: 0.5, label: '$\\tfrac12$', lx: 0.4 }],
  series: [
    { x: 't', y: 'GUE', style: 'thick', label: 'GUE (chaotic)', step: [1, 3], stops: [30, 'max'] },
    { x: 't', y: 'Poisson', style: 'dashed', label: 'uncorrelated levels', step: 4 },
  ],
  marks: [{ at: 'max:GUE', label: '$\\text{peak } {y:.2f}\\,N$', step: 2, dx: -10, anchor: 'end' }],
  legend: 'tl',                                        // 'auto' (default) picks the emptiest corner
});
```

| Chart field | Meaning |
|:--|:--|
| `viewBox`, `box` | default `[0,0,760,440]`; plot box `{x,y,w,h}` (default leaves room for tick labels) |
| `x`, `y` | `{range, log, ticks, label, fmt}`; `fmt`: function, `'pow10'` ($10^k$), `'pi'` (multiples of π), `'none'` |
| `series[]` | data: `{x: key, y: key}` (keys into `data` or `LP.ds`, `x` omitted = 1, 2, …), `xy: [[x,y],…]`, or `fn: x => …` with `domain`, `n`. Kind: line (default), `points: true`, `bars: true`, `band: [loKey, hiKey]`. `style`: lines `ink thick thin mid soft dashed dotted ink-dashed faint`, points `dot open mid square` |
| `step`, `until` | appears in step `s`, or builds up over `[a, b]`; hidden after `until`. Lines are drawn along x (`reveal: 'draw'`), points appear one by one (`'seq'`), anything can `'fade'`. `stops: [x1, 'max', …]` ends each step of a multi-step line at that x |
| `label`, `labelAt` | legend entry; with `labelAt: 'end' \| 'start' \| 'max' \| x` the label sits on the curve instead (`dx`, `dy`, `anchor`) |
| `hlines`, `vlines`, `marks`, `text` | reference lines; points (`at: 'max:<key>' \| 'min:…' \| 'last:…'` or `x`, `y`) with labels; free labels in data coordinates (`coords: 'px'` for viewBox units) |
| `title` | a short heading centred above the plot box (useful for panels) |
| `panels[]`, `cols`, `layout`, `sharex`, `sharey` | several plot boxes in one figure: each panel is a chart spec (`series`, `x`, `y`, `hlines`, `marks`, `legend`, `title`, `box`, …) and inherits `data`, `size`, `grid`, `arrows`, `x`, `y` from the chart. Default one row; `cols: k` makes a grid, `layout: 'col'` a stack. `sharex` labels the x axis only on the bottom panel of each column, `sharey` the y axis only in the left column. Steps count across all panels |
| `params`, `y: P => key`, `when: P => bool` | sliders and selects as in modules; a series can switch dataset key or hide by parameter |
| `draw(svg, kit, S, P)`, `update(state, f, S)` | escape hatch for one extra element |

Labels use `$…$` for TeX, otherwise plain text (`\n` breaks lines); `{y:.2f}` in a mark label prints the point's value.

```js
// figures/flow.js
export default LP.diagram({
  viewBox: [0, 0, 760, 300],
  nodes: [
    { id: 'h', x: 100, y: 150, w: 150, h: 60, text: 'Hamiltonian', step: 1 },
    { id: 'k', x: 380, y: 150, tex: '\\{b_n\\}', sub: 'Lanczos', step: 2, fill: 'fband' },
    { id: 'c', x: 660, y: 150, text: 'complexity', step: 3, href: 'note:krylov#sec-spread' },
  ],
  edges: [
    { from: 'h', to: 'k', label: 'Krylov basis', step: 2 },
    { from: 'h', to: 'c', bend: 0.25, dashed: true, label: 'Nielsen', step: 3 },
  ],
});
```

Nodes are centred at `x, y` (`w`, `h`, `shape: box|round|circle|plain`, `fill: fbox|fband|fpaper|fink`, `sub` for a
second, smaller line, `href` to a section or `note:<id>#<anchor>`). Edges attach at the node outlines (`bend` as a
fraction of their length, `dashed`, `both`, `arrow: false`); labels sit above the edge (`side: 'below'`), and the lint
reports a label that does not fit between two boxes.

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

Three optional registry fields make a series cheaper to grow (`livepaper series new` sets all three):

- `"common": "common.md"`: a Markdown file holding only front matter (author, date, footer, `bibliography: ../refs.json`, `macros`). It is read before each note's `paper.md`, so a note's own values win and macros merge key by key. Paths in it are relative to each note's folder.
- `"hub": "<id>"` and `"menu": "hub"`: a note other than the hub then embeds, and lists in its Notes menu, only the hub ("· all notes"), itself and the notes it links to (from `note:` links in the text and in figures). Adding a note to the series changes only the hub and the notes that link to the new one, so only they need republishing. The hub lists every note.

```sh
livepaper series new notes --title "My notes" --notes hub:Overview,primer:Primer,a:First topic   # scaffold (first = hub)
livepaper series status notes/series.json      # per note: write, build, rebuild, publish (new), republish, or ok
livepaper series build notes/series.json       # rebuild every stale note (--pdf for PDFs too)
livepaper series published a https://claude.ai/artifact/... notes/series.json   # URL into the registry + hash of the artifact
```

`series new` also writes `refs.json`, `notation.md` (one symbol table for all notes) and `briefs/<id>.md` (a template
for the brief a note is written from). `status` calls a note stale when a file in its folder, the common file or
the bibliography is newer than its build, or when the series block in its built artifact no longer matches the registry
(a linked note got a URL or a new title). After a rebuild, `republish` appears only for notes whose `artifact.html`
differs from the one recorded by `series published`.

Workflow for a new note:

1. Add it to the registry with `"url": null` (or scaffold it with `series new` in an empty folder and copy it over).
2. Build and publish it, then `livepaper series published <id> <url>`.
3. `livepaper series build`, then `livepaper series status`: republish the notes marked `republish`, and record each with `series published`.

The skill `skills/live-series/SKILL.md` (with `note-agent.md`, the prompt for one note agent) describes how to plan and write a whole series with one fresh agent per note.

## Bibliography

```sh
livepaper bib add refs.json arXiv:2202.06957 quant-ph/0502070 doi:10.1103/PhysRevX.9.041017 nielsen=quant-ph/0603161
livepaper bib todo refs.json          # entries without a summary, each with the start of its abstract
livepaper bib summaries refs.json s.txt   # merge lines "key: summary" into "x-summary"
livepaper bib keys refs.json          # key, year, first author, title: one line per entry
```

`add` takes arXiv ids (new or old style, with or without `arXiv:`, abs/pdf URLs) and DOIs, and writes CSL-JSON with
only what the services return: arXiv for title, authors, date and abstract; Crossref (through the DOI that arXiv or
INSPIRE give) for the journal, volume, page and year; INSPIRE's publication info when there is no DOI; otherwise a
preprint entry. Keys are `<first author><year>` with a title word on collisions, or the `key=` you give. The abstract
is converted to Markdown in which only `$…$` is live; titles keep plain text (a warning names titles that still
contain TeX). Entries already present (same arXiv id or DOI) are left alone. Requests are spaced to respect the
services' rate limits.

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
- `runtime/paginate.js` flows the article into fixed sheets. Paragraphs split at word boundaries (KaTeX stays atomic), and lists, environments and reference lists split between items. Figures, tables and algorithms float to the next column. Wide items go to a band at the top of the next page, full figures get their own page, and footnotes go to the foot of their column. Columns are absolutely positioned with CSS containment, so each measurement only re-lays-out one column: a 14-page paper paginates in about 0.2 s. Pages are typeset at the zoom they are shown at, because text breaks into lines slightly differently at other zooms; a resize or zoom change that makes a column overflow typesets again, and printing typesets at zoom 1. Before the first layout the runtime waits for the KaTeX font loads themselves: WebKit (Safari, every iOS browser) resolves `document.fonts.ready` before those loads start, so pages measured with fallback glyphs overflowed on iPads and on Mac Safari once KaTeX's faces arrived. As a safety net it looks for overflowing columns again 0.4, 1.5 and 4 s after load (WebKit does not always fire `loadingdone`). WebKit also reports `getBoundingClientRect` inside the zoomed page container in unzoomed units (document position / zoom − scroll), which put link previews and abstracts far from their links on iPads; `visualRect` in `runtime/ui.js` detects this (a sheet's reported width against its layout width) and corrects it. A column shortened by a band of wide figures passes a float or block that is too tall for it on to a full column (at most twice) instead of overflowing.
- `runtime/player.js` gives each scene its own clock; `runtime/ui.js` handles the toolbar, zoom, modes, theme, links, tooltips and the report used by `check`.
- `runtime/charts.js` turns chart and diagram specs into figure definitions; `runtime/lint.js` measures figure labels and page fill for `check`.
- `src/bib.mjs`, `src/series.mjs` and `checkDevices` in `src/browser.mjs` implement `bib`, `series` and `devices`.

## Tests

`npm test` runs these checks:

- filter output for both formats;
- the build (single file, fragment, inlining, KaTeX);
- headless layout of the demo, including phone width and interaction;
- splitting of long paragraphs across columns and pages, headings, zoom, exercises, tooltips on touch screens;
- chart and diagram specs, and the figure lint on a figure with broken labels;
- series scaffold, shared front matter, hub navigation, status and publish records; bibliography helpers (offline).

License: MIT. `csl/ieee.csl` is from the Citation Style Language project (CC BY-SA 3.0).
