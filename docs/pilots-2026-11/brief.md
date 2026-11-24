# Brief: Chaos and Krylov Complexity (`krylov`)

Role: companion note to the overview ([its Krylov section](note:overview#sec-krylov)). Target length: 10-14 pages.
Reader: has read the overview, the math primer (Jacobi fields and conjugate points: `note:primer#sec-jacobi`,
`#sec-conj`; Lie groups `#sec-lie`) and the physics primer (chaos, OTOCs, SYK: `note:physics#sec-chaos`, `#sec-otoc`,
`#sec-syk`).

## Scope
The complexity of time evolution $e^{-iHt}$ in two languages: Nielsen geometry (is the one-parameter subgroup a
minimizing geodesic, and when does it reach its first conjugate point?) and Krylov / spread complexity (how an
operator or state spreads along the Lanczos chain). How the two relate, a bulk length in double-scaled SYK, behaviour
across a phase transition, open systems.

## Sections (with the one result each must derive)
1. Two complexities of time evolution: set up both, state what each predicts for chaotic vs integrable H.
2. Conjugate points of $e^{-iHt}$: the Jacobi equation along a one-parameter subgroup of a right-invariant penalty
   metric; closed form for the penalized qubit (derive $\det J(t)$ and the first conjugate time); numerics for
   n = 3, 4 qubits under the cliff metric: first conjugate time vs penalty q for chaotic, free-fermion and commuting
   two-local Hamiltonians (does q push it out without bound?). Appendix: how the conjugate times are computed.
3. Krylov complexity: the Lanczos algorithm for operators; an exactly solvable SL(2,R) chain with closed-form K(t);
   the operator growth hypothesis; numerical $b_n$ for a mixed-field Ising chain (chaotic vs free-fermion point).
4. Spread complexity of the infinite-temperature thermofield double: GUE vs uncorrelated levels (ramp, peak, slope,
   plateau); prove the late-time value for any non-degenerate spectrum.
5. Krylov and Nielsen: show on a qubit that Krylov complexity is not a distance; the relation for squared lengths of
   straight lines [@craps2024krylov; @craps2026explicit].
6. A bulk length: the chord chain of double-scaled SYK and its semiclassical length (derive the closed form and its
   late-time velocity) [@berkooz2019; @lin2022; @rabinovici2023].
7. Complexity across a phase transition: Kitaev chain, Gaussian-state complexity per site vs chemical potential;
   derive the singular part of its derivative at the critical point.
8. Open systems and channels: Krylov dynamics with dissipation (a damped chain) [@liu2023open; @bhattacharya2022].
9. Open problems.

## Results to verify (script + test for each number or closed form)
- penalized-qubit Jacobi determinant and first conjugate time; conjugate-time table for n = 3, 4 (cap any single
  computation at about 10 minutes; n = 5 is optional);
- SL(2,R) chain: $b_n$ and $K(t)$ against direct Lanczos; Ising $b_n$ with full reorthogonalisation;
- spread complexity late-time value; GUE curves (state the matrix size and number of samples);
- chord-chain semiclassical length vs exact numerics; Kitaev-chain divergence coefficient.

## Figures (data from the script; LP.chart / LP.diagram unless bespoke)
- conjugate time vs penalty q (three Hamiltonian classes, n = 3, 4); Lanczos coefficients (Ising, two points);
- spread complexity K(t)/N, GUE vs uncorrelated (log time); chord-chain length vs time (exact vs semiclassical);
- Kitaev-chain complexity and its derivative vs chemical potential.

## References (keys in notes/refs.json)
parker2019, lanczos1950, balasubramanian2022spread, caputa2023, rabinovici2023, rabinovici2025, nandy2025,
craps2024krylov, craps2026explicit, aguilar2024, ambrosini2025, heller2025, balasubramanian2025, beetar2026,
berkooz2019, lin2022, kitaev2001, liu2020, xiong2020, khan2018, hackl2018, liu2023open, bhattacharya2022,
balasubramanian2020, balasubramanian2021, acalapati2026, acevedo2026channels, acevedo2026transport, cheeger1975, petersen2016

## Links
- background: note:primer#sec-jacobi, note:primer#sec-conj, note:physics#sec-syk, note:physics#sec-otoc,
  note:manybody#sec-size; overview: note:overview#sec-krylov
- exercises: note:exercises#sec-krylov; open problems collected in note:agenda
