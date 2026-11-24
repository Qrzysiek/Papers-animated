---
name: live-series
description: Build a whole series of live papers on a topic (a hub overview with a clickable map, background primers, deep companion notes, exercises with hidden solutions, an open-problems agenda), each with verified formulas, data-driven live figures and a LaTeX PDF, with one fresh agent per note so the cost stays low. Use when the user asks for "a series of notes", "a collection like the Nielsen notes", a multi-note review, course or reading programme on a topic, or wants to add notes to an existing series. For a single note use the live-paper skill.
---

# Live series

A series is a set of live papers (see the live-paper skill) that share a registry, a bibliography, a notation table and
front matter, and link to each other. The toolkit is at `C:\Users\qrzys\Documents\Projects\Papers_animated`
(README.md: "Series of notes", "Chart and diagram figures", "Bibliography"). The Nielsen-geometry series
(`C:\Users\qrzys\Documents\Projects\Research\Nielsen_Geometry\notes`) is the worked example.

**Where the tokens go, and the rules that follow.** A long main session that writes notes itself re-reads its whole
context (often 0.5 M tokens) on every call. So:

- You, the orchestrator, never write note text, read note sections, page screenshots or artifact HTML. You read the
  plan, the briefs and each note agent's short report.
- Each note is written by **three fresh agents in turn** (Agent tool, general-purpose): verify (script, tests, figure
  data, `results.md`), write (text and figure specs from `results.md`), check and polish. They hand over through
  files, so no context grows large: one agent doing all three reached 450 k tokens per turn in the Krylov pilot,
  while a fresh polish agent needed 60 k. Run up to three notes at a time in the background.
- Agents use the tools that replace reading: `livepaper check` (text report plus one contact sheet, `lint-*.png` crops
  of flagged figures), `livepaper bib`, `LP.chart` / `LP.diagram` figure specs fed by data files that the note's
  checking script writes, and `livepaper series status`.

## 1. Plan (one short exchange with the user)

Settle topic, audience, depth and size; default is a hub, one or two primers, three to six companions, exercises and an
agenda. Search the literature (arXiv/INSPIRE APIs, web search) for the 30 to 80 works the series rests on. Then write
`notes/plan.md`:

- a map of the field: 5 to 8 regions, each a companion note, and the background each needs (primers);
- per note: id, title, 4 to 8 sections, the results it must derive (closed forms, numbers, small theorems), 2 to 4
  figures, its references (arXiv ids or DOIs), and the anchors it links to in other notes (`note:<id>#sec-<label>`);
- the notation conflicts to settle once (sign conventions, normalisations).

Show the user the note list and the map in at most 15 lines. Go on unless they object.

## 2. Scaffold

```sh
livepaper series new notes --title "<Series title>" --author "<name>" --notes hub:Overview,primer:Primer,a:...,exercises:Exercises,agenda:Open problems
```

This writes `series.json` (the hub navigation: a note's menu lists only the hub and the notes it links to, so a new
note means republishing only the hub and the notes that link to it), `common.md` (shared front matter: author, date,
footer, `bibliography: ../refs.json`, macros), `refs.json`, `notation.md` and `briefs/<id>.md`.

- Put every macro used by two notes into `common.md`, and fill `notation.md` (symbol, meaning, convention, macro).
- Fill each brief from the plan (template in `briefs/<id>.md`): scope, sections with their key result, the results to
  verify, figures with the data each needs, reference keys, links. Fix the section labels other notes link to.

## 3. Bibliography, once for the whole series

```sh
livepaper bib add notes/refs.json arXiv:1812.08657 quant-ph/0502070 doi:10.1103/... key=<id>   # all at once
livepaper bib todo notes/refs.json > notes/bib-todo.txt       # entries without a summary + start of the abstract
# write notes/ref-summaries.txt: one line per key, "key: summary" (1-2 lines, from the abstract, $..$ math allowed)
livepaper bib summaries notes/refs.json notes/ref-summaries.txt
livepaper bib keys notes/refs.json                            # the key list the briefs cite
```

Metadata comes only from arXiv, Crossref and INSPIRE. Books and pre-DOI papers: add by DOI when one exists; otherwise
write the CSL entry by hand from a source you checked. Put the key list into the briefs, not the abstracts.

## 4. Notes: one agent each

Order: primers first (companions link to their anchors), then companions in parallel, then exercises and the agenda
(their agents read only the companions' "Open problems" sections and the briefs), then the hub (its map links every
note). Give the three agents of each note the prompts in `note-agent.md` (same folder as this skill), one after the
other, with the note's id and paths filled in. Each report is at most 10 lines; keep them and each note's
`results.md`, they feed the hub, the exercises and the agenda.

If a report lists a failed check or an unverified claim, send a follow-up agent with only that item; do not fix it by
reading the note yourself.

## 5. Publish

For each note: publish `notes/<id>/dist/artifact.html` with the Artifact tool (a new path gives a new URL), then

```sh
livepaper series published <id> <url> notes/series.json   # stores the URL and the artifact's hash
livepaper series build notes/series.json                   # rebuilds notes whose links changed
livepaper series status notes/series.json                  # 'republish' only where the artifact really changed
```

Republish exactly the notes marked `republish`, to their existing URLs, then run `series published` for each again.
For an artifact from an earlier session, publishing with `url` is refused once and hands back the live page; check it
matches the previous build (diff against `git show HEAD~1:notes/<dir>/dist/artifact.html`, expect only the 3 wrapper
lines) instead of reading it, then publish again.

## 6. Hand over

Commit only when the user asks. Give the user the links, the PDFs' paths and the list of open problems; put the plan,
briefs, reports and the series state into project memory.
