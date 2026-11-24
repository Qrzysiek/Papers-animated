# Complexity across a phase transition {#sec:kitaev}

The previous sections followed the complexity of $e^{-iHt}$ in time. Here time plays no role: we fix the Hamiltonian,
take its ground state, and ask how the complexity of that state changes as a coupling crosses a quantum critical
point. The Kitaev chain [@kitaev2001] is the cleanest case. It is a free-fermion model, so its ground states are
Gaussian, and Nielsen's problem restricted to Gaussian states and Gaussian gates splits into one small problem per
momentum pair [@hackl2018; @khan2018]. Circuit complexity across its topological transition was studied in
[@liu2020; @xiong2020], and spread complexity (@sec:spread) of the same chain in [@caputa2023]. Below we derive a
closed form for the complexity per site and the exact singular part of its derivative at the critical points.

## Conventions

The chain has chemical potential $\mu$, hopping $w$ and pairing $\Delta$:
$$\begin{aligned}H={}&-\mu\sum_j c_j^\dagger c_j-w\sum_j\big(c_j^\dagger c_{j+1}+\text{h.c.}\big)\\
&+\Delta\sum_j\big(c_jc_{j+1}+\text{h.c.}\big).\end{aligned}$$ {#eq:bulk-kitaev-h}
We set $w=\Delta=\tfrac12$. In momentum space $\epsilon_k=-\mu-\cos k$, $\abs{\Delta_k}=\sin k$ and
$E_k^2=1+2\mu\cos k+\mu^2$. The gap closes at $\mu_c=\pm1$ (at $k_c=\pi$ and $k_c=0$ respectively), and the chain is
topological for $\abs\mu<1$. The ground state pairs $k$ with $-k$,
$$\ket{\Omega_\mu}=\prod_{0<k<\pi}\big(\cos\theta_k+e^{i\varphi_k}\sin\theta_k\,c_k^\dagger c_{-k}^\dagger\big)\ket0,$$ {#eq:bulk-kitaev-gs}
with $2\theta_k=\operatorname{atan2}(\sin k,\,-\mu-\cos k)\in[0,\pi]$.

Each pair mode lives in the two states $\ket0$ and $c_k^\dagger c_{-k}^\dagger\ket0$, a Bloch sphere, and
$\abs{\theta_k-\theta_k^R}$ is the geodesic (Fubini-Study) angle between the target and a reference ground state
with angles $\theta_k^R$. The F2 cost of the Gaussian circuit, squared, adds these angles in quadrature. Per site,
$$c(\mu)=\lim_{L\to\infty}\frac{\Cc^2}{L}=\frac1{2\pi}\int_0^\pi\big(\theta_k-\theta^R_k\big)^2\,\dd k .$$ {#eq:bulk-kitaev-c}
A basis-free form, which we use on the lattice, is $\Cc^2=\frac1{16}\sum_j\phi_j^2$, where $e^{i\phi_j}$ are the
eigenvalues of $(2P_T-1)(2P_R-1)$ and $P=\langle\Psi\Psi^\dagger\rangle$ is the Nambu projector of target or
reference. Each pair contributes $\pm2(\theta_k-\theta_k^R)$, each twice, so the two forms agree. Our default
reference is the vacuum ($\mu_R\to-\infty$, $\theta^R=0$). A paper that measures the pair angle as $2\theta_k$ gets
four times our values; we have not matched other normalisations.

## The complexity per site

With $\chi_2(x)=\sum_{m\ \text{odd}}x^m/m^2=\tfrac12[\mathrm{Li}_2(x)-\mathrm{Li}_2(-x)]$, the integral
@eq:bulk-kitaev-c is
$$c(\mu)=\begin{cases}\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\le-1,\\[2pt]
\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu), & \abs\mu\le1,\\[2pt]
\tfrac{\pi^2}{8}-\tfrac12\chi_2(\mu^{-1})+\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\ge1,\end{cases}$$ {#eq:bulk-kitaev-closed}
and its derivative is
$$c'(\mu)=\begin{cases}\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu<-1,\\[2pt]
\tfrac{\operatorname{artanh}\mu}{4\mu}, & \abs\mu<1,\\[2pt]
\tfrac1{2\mu}\operatorname{artanh}\tfrac1\mu+\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu>1.\end{cases}$$ {#eq:bulk-kitaev-dc}

The derivation rests on one identity: $\epsilon_k+i\abs{\Delta_k}=-(\mu+e^{-ik})$, so
$2\theta_k=\arg[-(\mu+e^{-ik})]$. For $\abs\mu<1$ we factor out $-e^{-ik}$ and expand the logarithm,
$$2\theta_k=\pi-k+\operatorname{Im}\ln(1+\mu e^{ik})=\pi-k+\sum_{m\ge1}\frac{(-1)^{m+1}\mu^m}{m}\sin mk .$$
We square and integrate over $[0,\pi]$ using $\int_0^\pi(\pi-k)\sin mk\,\dd k=\pi/m$ and
$\int_0^\pi\sin mk\sin m'k\,\dd k=\tfrac\pi2\delta_{mm'}$. The three terms give
$c=\tfrac{\pi^2}{24}-\tfrac14\mathrm{Li}_2(-\mu)+\tfrac1{16}\mathrm{Li}_2(\mu^2)$, which is
$\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu)$. For $\abs\mu>1$ we expand in $x=1/\mu$ instead:
$2\theta_k=\pi-\sum_m\frac{(-1)^{m+1}x^m}{m}\sin mk$ for $\mu>1$ and the same without the $\pi$ for $\mu<-1$. The
cross term now needs $\int_0^\pi\sin mk\,\dd k=2/m$ for odd $m$, and gives $-\tfrac12\chi_2(x)$. The derivatives
follow from $\chi_2'(x)=\operatorname{artanh}(x)/x$ and $\frac{\dd}{\dd x}\mathrm{Li}_2(x^2)=-2\ln(1-x^2)/x$.

Special values: $c(-1)=\pi^2/96=0.102808$, $c(0)=\pi^2/24=0.411234$, $c(1)=7\pi^2/96=0.719659$,
$c(+\infty)=\pi^2/8=1.233701$ (all pairs filled) and $c(-\infty)=0$, with $c'(0)=1/4$. The function $c$ is
continuous and increasing (@fig:kitaev). At $\mu=1$ the angles are linear in $k$, $\theta_k=\tfrac\pi2-\tfrac k4$;
at $\mu=-1$, $\theta_k=\tfrac\pi4-\tfrac k4$. The closed forms match direct quadrature at 12 values of $\mu$ to
$10^{-11}$. On a real-space BdG chain ($L=40$, antiperiodic) the Nambu-projector formula equals the momentum sum to
$10^{-11}$, for the vacuum and two other references. The finite-$L$ sum approaches the integral with error
$\propto1/L^2$ for $\mu>-1$ and exponentially fast for $\mu<-1$.

::: {.figure #fig:kitaev live="figures/kitaev.js"}
Complexity per site $c(\mu)$ of the Kitaev ground state relative to the vacuum (@eq:bulk-kitaev-closed, solid),
[the lattice values at $L=100$]{.s2} (circles) and [its derivative $c'(\mu)$]{.s3} (@eq:bulk-kitaev-dc, dashed).
The vertical lines mark $\mu_c=\pm1$; between them the chain is topological. $c$ is continuous and rises to
$\pi^2/8$; $c'$ diverges logarithmically at both critical points, and the grid, which stops at
$\abs{\mu-\mu_c}=0.01$, cuts the peaks off there.
:::

## The singular part of the derivative

With $\delta=\mu-\mu_c$, the derivative near either critical point is
$$\frac{\dd c}{\dd\mu}=-\frac18\ln\abs{\mu-\mu_c}+A_\pm+O(\delta\ln\abs\delta),$$ {#eq:bulk-kitaev-sing}
where $A_-=\tfrac{\ln2}8$ and $A_+=\tfrac{3\ln2}8$ at $\mu_c=1$, and $A_-=-\tfrac{\ln2}8$, $A_+=\tfrac{\ln2}8$ at
$\mu_c=-1$. So $c$ is continuous, $c'$ diverges logarithmically with coefficient $-1/8$, and the regular part jumps by
$A_+-A_-=\tfrac{\ln2}{4}$. It is larger on the side $\mu>\mu_c$, where the pair at $k_c$ is filled.

The argument is local in $k$ and holds for any reference. First, $\partial_\mu\theta_k=\sin k/(2E_k^2)$, so
$c'=\frac1\pi\int_0^\pi(\theta_k-\theta_k^R)\,\partial_\mu\theta_k\,\dd k$. Near $k_c$, with $p=\abs{k-k_c}$, we
have $E_k^2\simeq\delta^2+p^2$ and $\partial_\mu\theta\simeq p/[2(\delta^2+p^2)]$. For $\mu_c=1$,
$2\theta\simeq\operatorname{atan2}(p,-\delta)$. So $\theta$ sits at the critical value $\pi/4$ for
$\abs\delta\ll p\ll1$ and goes to $0$ ($\delta<0$) or $\pi/2$ ($\delta>0$) as $p\to0$. The window
$\abs\delta<p<1$ gives
$$\frac1\pi\Big(\frac\pi4-\theta^R_{k_c}\Big)\int_{\abs\delta}^1\frac{\dd p}{2p}
=-\frac1{2\pi}\Big(\frac\pi4-\theta^R_{k_c}\Big)\ln\abs\delta ,$$ {#eq:bulk-kitaev-window}
which is $-\tfrac18\ln\abs\delta$ for $\theta^R_{k_c}=0$ and $+\tfrac18\ln\abs\delta$ for
$\theta^R_{k_c}=\tfrac\pi2$. A non-critical reference ground state has $\sin k_c=0$ in its angle, so
$\theta^R_{k_c}$ is $0$ or $\tfrac\pi2$: the size of the coefficient is set by the critical angle $\pi/4$, and the
reference fixes only its sign.
The jump comes from $p\lesssim\abs\delta$, where $\theta_+-\theta_-=\arctan(\abs\delta/p)$. With
$x=p/\abs\delta=\cot u$,
$$\frac1\pi\int_0^\infty\frac{x\arctan(1/x)}{2(1+x^2)}\,\dd x=\frac1{2\pi}\int_0^{\pi/2}u\cot u\,\dd u=\frac{\ln2}{4}.$$
The constants $A_\pm$ themselves come from @eq:bulk-kitaev-dc; for $\mu\to1^-$, for instance,
$\operatorname{artanh}(\mu)/(4\mu)\simeq\frac18\ln\frac{2}{1-\mu}$. Numerically $\ln2/8=0.0866434$,
$3\ln2/8=0.259930$ and $\ln2/4=0.173287$.

We checked @eq:bulk-kitaev-sing on all four sides at $\delta=10^{-4},10^{-6},10^{-8}$ from the closed form (error
below $2\delta\abs{\ln\delta}$) and from direct quadrature for $\delta\ge10^{-5}$. For the references $\mu_R=3$,
$0.5$ and $-3$ the slope is $\pm1/8$ to $10^{-3}$, as @eq:bulk-kitaev-window predicts. Complexity of the ground
state thus detects the transition in its first derivative, with a logarithm whose size is fixed and whose sign
depends on the reference.
