# Outline and work split for `krylov` (read together with krylov.md)

Fixed file names and labels, so that agents working in parallel can cross-reference (`@sec:<label>`).

| File | Label | Section | Results from | Written by |
|:--|:--|:--|:--|:--|
| sections/01-two.md | sec:two | Two complexities of time evolution | brief | writer 1 |
| sections/02-conjugate.md | sec:conj | Conjugate points of $e^{-iHt}$ | results-conj.md | writer 1 |
| sections/03-krylov.md | sec:krylov | Krylov complexity (Lanczos, SL(2,R), growth hypothesis) | results-lanczos.md | writer 1 |
| sections/04-spread.md | sec:spread | Spread complexity of the TFD | results-lanczos.md | writer 1 |
| sections/05-relation.md | sec:relation | Krylov and Nielsen | results-lanczos.md | writer 1 |
| sections/06-chords.md | sec:chords | A bulk length (DSSYK chord chain) | results-bulk.md | writer 2 |
| sections/07-kitaev.md | sec:kitaev | Complexity across a phase transition | results-bulk.md | writer 2 |
| sections/08-open.md | sec:opensys | Open systems and channels | results-bulk.md | writer 2 |
| sections/09-problems.md | sec:problems | Open problems | all three results files | writer 2 |
| sections/10-appendix.md | sec:app-conj | Appendix: computing conjugate times (`{.appendix}`) | results-conj.md | writer 2 |

Verification groups (one agent each, in parallel):

| Group | Brief sections | Script / test | Figure data (becomes) | Hand-over |
|:--|:--|:--|:--|:--|
| conj | 2 and the appendix | scripts/krylov_conj.py, tests/test_krylov_conj.py | figures/_kconj.json (`LP.ds.kconj`) | notes/krylov/results-conj.md |
| lanczos | 3, 4, 5 | scripts/krylov_lanczos.py, tests/test_krylov_lanczos.py | figures/_klan.json (`LP.ds.klan`) | notes/krylov/results-lanczos.md |
| bulk | 6, 7, 8 | scripts/krylov_bulk.py, tests/test_krylov_bulk.py | figures/_kbulk.json (`LP.ds.kbulk`) | notes/krylov/results-bulk.md |

Figure files: figures/conj.js (conjugate time vs q), figures/lanczos.js, figures/spread.js, figures/chord.js,
figures/kitaev.js, optional figures/routes.js (diagram of the two notions, attached to the abstract by writer 1).
Equation, figure and table labels: prefix them with the group (`eq:conj-...`, `fig:spread`, `tbl:conj-...`).
