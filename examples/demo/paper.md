---
title: "A [Live]{.inv} Paper"
subtitle: "a two-page template showing every construct livepaper supports"
author: "Your Name"
date: "2026"
pagetitle: "Live Paper Template"
runhead: "A live paper &middot; template"
topics: "livepaper &middot; template"
footer-right: "livepaper template"
keywords: [live paper, template, pandoc]
abstract: |
  This template shows the building blocks of a live paper. [Phrases in the abstract]{.s1} can follow the steps of the first figure, [one step at a time]{.s2}, and [the reader controls the clock]{.s3}. The same file builds a paged interactive HTML page and a LaTeX PDF.
abstract-steps: "phrases|steps|clock"
macros:
  ket: '\left|#1\right\rangle'
  tr: '\operatorname{tr}'
bibliography: refs.bib
---

::: {.figure #fig:loop live="figures/loop.js" .wide scene=abstract snap=3}
A wide live figure tied to the abstract's scene. A token travels round a loop in three steps; the abstract phrases light up with it. In the PDF it appears frozen at its snapshot step.
:::

# Introduction {#sec:intro}

Write ordinary Markdown. Math uses dollars, $\ket{\psi}=\sum_k c_k\ket{k}$, and numbered displays take a label:
$$
\tr\rho=1,\qquad \rho\ge0 .
$$ {#eq:state}
Refer to it as @eq:state, to sections as @sec:geo, to figures as @fig:loop, to tables as @tbl:parts and to results as @thm:main. Citations use keys from the bibliography [@nielsen2010]. Footnotes work too.[^fn]

[^fn]: They are set at the foot of the column that references them.

# A scene {#sec:geo}

::: {.scene #sc:demo steps="draw|move|done" dur=2.4}
Text inside a scene can mark [a phrase for step one]{.s1}, [another for step two]{.s2} and [a range]{.s2-3}. Equation terms can be marked as well:
$$
E=\htmlClass{s1}{\tfrac12mv^2}+\htmlClass{s2}{V(x)} .
$$ {#eq:energy}

::: {.figure #fig:dot live="figures/dot.js" snap=3}
A column figure inside the scene: [the curve is drawn]{.s1}, [the dot moves]{.s2}, [and stops]{.s3}. Drag the slider to change the curve.
:::

::: {.algorithm #alg:steps title="What a scene does"}
1. **Input:** a list of step names
2. [highlight phrases of step 1]{.s1}
3. [move to step 2]{.s2}
4. [hold at the last step]{.s3}
:::
:::

::: {.theorem #thm:main title="An example"}
Theorem-like environments are numbered with a shared counter: theorem, lemma, proposition, corollary, definition, example, conjecture.
:::

::: proof
Proofs end with a square.
:::

::: {.table #tbl:parts}
| Part | Markdown | Live HTML |
|:--|:--|:--|
| [scene]{.s1} | `::: {.scene ...}` | one clock per scene |
| figure | `::: {.figure live=...}` | JS module, snapshot in PDF |
| table | `::: {.table #tbl:x}` | numbered, caption above |

Table: Building blocks.
:::

::: takeaway
write once, read it paged, reflowed or printed
:::

# References {.unnumbered}

::: {#refs}
:::
