# Complexity across a phase transition {#sec:kitaev}

Does complexity notice a quantum phase transition? The cleanest test is the Kitaev chain [@kitaev2001], a free-fermion model whose ground state is Gaussian, so that its complexity can be computed exactly mode by mode [@hackl2018; @khan2018]. Earlier work found that the complexity of the ground state, or its derivative, is non-analytic at the critical point [@liu2020; @xiong2020]. Here we derive the full closed form per site and the exact singular part of its derivative.

## The chain and its Gaussian complexity

Take
$$H=-\mu\sum_jc_j^\dagger c_j-w\sum_j(c_j^\dagger c_{j+1}+\text{h.c.})+\Delta\sum_j(c_jc_{j+1}+\text{h.c.}),\qquad w=\Delta=\tfrac12 .$$
In momentum space $\epsilon_k=-\mu-\cos k$, $\abs{\Delta_k}=\sin k$ and $E_k^2=1+2\mu\cos k+\mu^2$. The gap closes at $\mu_c=\pm1$ (at $k_c=\pi$ and $k_c=0$ respectively), and the chain is topological for $\abs\mu<1$. The ground state pairs $k$ with $-k$,
$$\ket{\Psi}=\prod_{0<k<\pi}\big(\cos\theta_k+e^{i\varphi_k}\sin\theta_k\,c_k^\dagger c_{-k}^\dagger\big)\ket0,\qquad 2\theta_k=\operatorname{atan2}(\sin k,\,-\mu-\cos k)\in[0,\pi].$$
Each pair mode lives on a Bloch sphere, and $\abs{\theta_k-\theta_k^R}$ is the Fubini-Study angle between the target and a reference pair state. The squared F2 complexity per site is then
$$c(\mu)=\lim_{L\to\infty}\frac{\Cc^2}{L}=\frac1{2\pi}\int_0^\pi(\theta_k-\theta^R_k)^2\,\dd k .$$ {#eq:kitaev-c}
A basis-free form is $\Cc^2=\frac1{16}\sum_j\phi_j^2$, with $e^{i\phi_j}$ the eigenvalues of $(2P_T-1)(2P_R-1)$ and $P=\langle\Psi\Psi^\dagger\rangle$ the Nambu projector; each pair contributes $\pm2\Delta\theta_k$ twice. We take the vacuum as reference ($\mu_R\to-\infty$, $\theta^R=0$). A paper that uses the angle $2\theta_k$ would find all values below multiplied by 4.

## Closed form

The key identity is $\epsilon_k+i\abs{\Delta_k}=-(\mu+e^{-ik})$, so $2\theta_k=\arg[-(\mu+e^{-ik})]$. For $\abs\mu<1$ this expands as
$$2\theta_k=\pi-k+\operatorname{Im}\ln(1+\mu e^{ik})=\pi-k+\sum_{m\ge1}\frac{(-1)^{m+1}\mu^m}{m}\sin mk .$$
Squaring and integrating over $[0,\pi]$ with $\int_0^\pi(\pi-k)\sin mk\,\dd k=\pi/m$ and $\int_0^\pi\sin mk\sin m'k\,\dd k=\tfrac\pi2\delta_{mm'}$ gives
$$c=\tfrac{\pi^2}{24}-\tfrac14\mathrm{Li}_2(-\mu)+\tfrac1{16}\mathrm{Li}_2(\mu^2)=\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu),$$
with $\chi_2(x)=\sum_{m\ \text{odd}}x^m/m^2=\tfrac12[\mathrm{Li}_2(x)-\mathrm{Li}_2(-x)]$. Outside the topological phase expand in $x=1/\mu$: for $\mu>1$, $2\theta_k=\pi-\sum_m\frac{(-1)^{m+1}x^m}{m}\sin mk$, and $\int_0^\pi\sin mk\,\dd k=2/m$ for odd $m$; for $\mu<-1$ the constant $\pi$ is absent. Altogether
$$c(\mu)=\begin{cases}\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\le-1,\\[2pt]
\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu), & \abs\mu\le1,\\[2pt]
\tfrac{\pi^2}{8}-\tfrac12\chi_2(\mu^{-1})+\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\ge1.\end{cases}$$ {#eq:kitaev-closed}
Differentiating with $\chi_2'(x)=\operatorname{artanh}(x)/x$ and $\frac{\dd}{\dd x}\mathrm{Li}_2(x^2)=-2\ln(1-x^2)/x$,
$$c'(\mu)=\begin{cases}\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu<-1,\\[2pt]
\tfrac{\operatorname{artanh}\mu}{4\mu}, & \abs\mu<1,\\[2pt]
\tfrac1{2\mu}\operatorname{artanh}\tfrac1\mu+\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu>1.\end{cases}$$ {#eq:kitaev-deriv}

The special values are $c(-1)=\pi^2/96=0.102808$, $c(0)=\pi^2/24=0.411234$, $c(1)=7\pi^2/96=0.719659$, $c(+\infty)=\pi^2/8=1.233701$ (all pairs filled) and $c(-\infty)=0$, with $c'(0)=1/4$. The function is continuous and increasing (@fig:kitaev). At $\mu=1$ the angles are exactly linear, $\theta_k=\tfrac\pi2-\tfrac k4$ (at $\mu=-1$: $\tfrac\pi4-\tfrac k4$). The closed form agrees with quadrature to $10^{-11}$ at twelve values of $\mu$, and the Nambu-projector formula on a real-space antiperiodic chain of $L=40$ sites equals the momentum sum to $10^{-11}$; the finite-$L$ error falls as $1/L^2$ for $\mu>-1$ and exponentially for $\mu<-1$.

::: {.figure #fig:kitaev live="figures/kitaev.js"}
Gaussian-state complexity per site $c(\mu)$ of the Kitaev ground state relative to the vacuum, from @eq:kitaev-closed (thick), with lattice values at $L=100$ (circles), and its derivative $c'(\mu)$ (dashed). $c$ is continuous everywhere; $c'$ diverges logarithmically at $\mu_c=\pm1$.
:::

## The singular part at the critical point

The closed form shows that $c$ is continuous at $\mu_c$ while $c'$ is not. A local argument isolates the singularity and shows which part depends on the reference. With $\delta=\mu-\mu_c$:

1. $\partial_\mu\theta_k=\sin k/(2E_k^2)$, so $c'=\frac1\pi\int_0^\pi(\theta_k-\theta_k^R)\,\partial_\mu\theta_k\,\dd k$.
2. Near $k_c$, with $p=\abs{k-k_c}$, $E_k^2\simeq\delta^2+p^2$ and $\partial_\mu\theta\simeq p/[2(\delta^2+p^2)]$.
3. For $\mu_c=1$, $2\theta\simeq\operatorname{atan2}(p,-\delta)$: $\theta\to\pi/4$ (the critical value) for $\abs\delta\ll p\ll1$, while $\theta\to0$ ($\delta<0$) or $\pi/2$ ($\delta>0$) as $p\to0$.
4. The window $\abs\delta<p<1$ contributes $\frac1\pi(\frac\pi4-\theta^R_{k_c})\int_{\abs\delta}\frac{\dd p}{2p}=-\frac1{2\pi}(\frac\pi4-\theta^R_{k_c})\ln\abs\delta$.
5. The two sides differ by $\theta_+-\theta_-=\arctan(\abs\delta/p)$; with $x=p/\abs\delta=\cot u$ the jump is $\frac1\pi\int_0^\infty\frac{x\arctan(1/x)}{2(1+x^2)}\dd x=\frac1{2\pi}\int_0^{\pi/2}u\cot u\,\dd u=\frac{\ln2}{4}$.

The constants then follow from @eq:kitaev-deriv; for example $\frac{\operatorname{artanh}\mu}{4\mu}\simeq\frac18\ln\frac{2}{1-\mu}$ as $\mu\to1^-$. The result is
$$\frac{\dd c}{\dd\mu}=-\frac18\ln\abs{\mu-\mu_c}+A_\pm+O(\delta\ln\abs\delta),$$ {#eq:kitaev-sing}
with $A_-=\tfrac{\ln2}8=0.0866434$, $A_+=\tfrac{3\ln2}8=0.259930$ at $\mu_c=1$ and $A_-=-\tfrac{\ln2}8$, $A_+=\tfrac{\ln2}8$ at $\mu_c=-1$. The regular part jumps by $A_+-A_-=\tfrac{\ln2}{4}=0.173287$, larger on the side $\mu>\mu_c$ where the pair at $k_c$ is filled. For a general reference the log coefficient is $-\frac1{2\pi}\big(\frac\pi4-\theta^R_{k_c}\big)$: $-\tfrac18$ if $\theta^R_{k_c}=0$ and $+\tfrac18$ if $\theta^R_{k_c}=\tfrac\pi2$. Its magnitude is universal; only its sign records on which side of the critical angle $\pi/4$ the reference sits. These statements are checked at $\delta=10^{-4},10^{-6},10^{-8}$ on all four sides (error below $2\delta\abs{\ln\delta}$), and for references $\mu_R=3,0.5,-3$, where the slope is $\pm1/8$ to $10^{-3}$.

The contrast with @sec:conj and @sec:spread is instructive. There, complexity tracked dynamics; here a static ground-state complexity detects the transition only through a logarithmic divergence of its derivative, carried entirely by the modes near $k_c$.
