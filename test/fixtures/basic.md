---
title: A [Live]{.inv} Paper
subtitle: testing every construct
author: Test Author
abstract: |
  We test [the abstract phrase]{.s1} and [another]{.s2} with $x^2$.
abstract-steps: "one|two"
macros:
  ket: '\left|#1\right\rangle'
  tr: '\operatorname{tr}'
bibliography: basic.bib
---

# Introduction {#sec:intro}

See @sec:geo, @fig:demo, @thm:main, [@eq:ea; @eq:two], -@eq:ea and [@nielsen2006]. Footnote.[^n]
Some text before
$$
\dot L = i[L,H] \htmlClass{s2}{+ 0}
$$ {#eq:ea}
continuing after, with $\ket{\psi}$ and $\tr H$.

$$ a = b $$ {#eq:two}

[^n]: A footnote with $y$.

# Geometry {#sec:geo}

::: {.scene #sc:demo steps="draw|move|done"}
Text with [a phrase]{.s1} and [range]{.s2-3}.

::: {.figure #fig:demo live="figures/demo.js" snap=2}
The *caption* cites [@nielsen2006] and @eq:ea.
:::

::: {.algorithm #alg:one title="Compile a geodesic"}
1. **Input:** a path $H(t)$
2. [project]{.s1} onto 2-local terms
    1. nested step
3. Trotterize
:::
:::

::: {.theorem #thm:main title="Lower bound"}
Every circuit has $G \ge d/c$.
:::

::: proof
Triangle inequality.
:::

::: {.table #tbl:x}
| Measure | Object |
|:--|:--|
| [Gate]{.s1} | unitary |
| Nielsen | unitary |

Table: Comparison of measures.
:::

::: takeaway
complexity is distance
:::

## Sub {#sec:sub}

Ref to @tbl:x and @alg:one and @sec:sub.

# Appendix {.appendix #app:a}

Text.

# References {.unnumbered}

::: {#refs}
:::
