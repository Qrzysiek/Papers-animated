# Complexity across a phase transition {#sec:kitaev}

The Nielsen complexity of a fermionic Gaussian state can be computed mode by mode [@hackl2018; @khan2018]. For the
ground state of the Kitaev chain [@kitaev2001] it has been reported to be non-analytic at the topological transition
[@liu2020; @xiong2020], and spread complexity has been used to probe the same transition [@caputa2023]. This section
gives the complexity per site in closed form and isolates the singular part of its derivative at the critical point.

**Model.** The chain is

$$\begin{aligned}
H={}&-\mu\sum_jc_j^\dagger c_j-w\sum_j\big(c_j^\dagger c_{j+1}+\text{h.c.}\big)\\
&+\Delta\sum_j\big(c_jc_{j+1}+\text{h.c.}\big),
\end{aligned}$$

with $w=\Delta=\tfrac12$. In momentum space $\epsilon_k=-\mu-\cos k$, $\abs{\Delta_k}=\sin k$, and the quasi-particle
energy is $E_k^2=1+2\mu\cos k+\mu^2$. The gap closes at $\mu_c=1$ (at $k_c=\pi$) and at $\mu_c=-1$ (at $k_c=0$); the
phase $\abs\mu<1$ is topological. The ground state pairs $k$ with $-k$,

$$\begin{aligned}
\ket{\Omega_\mu}&=\prod_{0<k<\pi}\big(\cos\theta_k+e^{i\varphi_k}\sin\theta_k\,c_k^\dagger c_{-k}^\dagger\big)\ket0,\\
2\theta_k&=\operatorname{atan2}\big(\sin k,\,-\mu-\cos k\big)\in[0,\pi].
\end{aligned}$$ {#eq:bulk-gs}

**Complexity per site.** Each pair mode spans a qubit $\{\ket0,c_k^\dagger c_{-k}^\dagger\ket0\}$, a Bloch sphere on
which $\abs{\theta_k-\theta_k^R}$ is the Fubini–Study geodesic angle between the target and a reference ground state
with angles $\theta_k^R$. The F2 cost, squared and per site, is then

$$c(\mu)=\lim_{L\to\infty}\frac{\Cc^2}{L}=\frac1{2\pi}\int_0^\pi\big(\theta_k-\theta^R_k\big)^2\,dk .$$ {#eq:bulk-cdef}

Our default reference is the vacuum ($\mu_R\to-\infty$, $\theta^R_k=0$). The same number has a basis-free form,
$\Cc^2=\tfrac1{16}\sum_j\phi_j^2$, where $e^{i\phi_j}$ are the eigenvalues of $(2P_T-1)(2P_R-1)$ and
$P=\langle\Psi\Psi^\dagger\rangle$ is the Nambu projector of target or reference; each pair contributes
$\pm2\Delta\theta_k$ twice. On a real-space BdG chain with antiperiodic boundary conditions and $L=40$ this formula
equals the momentum sum to $10^{-11}$, for the vacuum and for two other references. A caution on normalisation: a
paper that uses the angle $2\theta_k$ instead of $\theta_k$ gets all values below multiplied by 4; we have not checked
the normalisations of [@liu2020; @xiong2020].

::: {.proposition #thm:bulk-kc title="Complexity per site"}
With $\chi_2(x)=\sum_{m\ \text{odd}}x^m/m^2=\tfrac12\big[\mathrm{Li}_2(x)-\mathrm{Li}_2(-x)\big]$ and the vacuum
reference,

$$c(\mu)=\begin{cases}\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\le-1,\\[2pt]
\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu), & \abs\mu\le1,\\[2pt]
\tfrac{\pi^2}{8}-\tfrac12\chi_2(\mu^{-1})+\tfrac1{16}\mathrm{Li}_2(\mu^{-2}), & \mu\ge1,\end{cases}$$ {#eq:bulk-kc}

$$c'(\mu)=\begin{cases}\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu<-1,\\[2pt]
\tfrac{\operatorname{artanh}\mu}{4\mu}, & \abs\mu<1,\\[2pt]
\tfrac1{2\mu}\operatorname{artanh}\tfrac1\mu+\tfrac1{8\mu}\ln(1-\mu^{-2}), & \mu>1.\end{cases}$$ {#eq:bulk-dc}
:::

::: proof
1. Since $\epsilon_k+i\abs{\Delta_k}=-(\mu+e^{-ik})$, the angle is $2\theta_k=\arg\big[-(\mu+e^{-ik})\big]$.
2. For $\abs\mu<1$ write $-(\mu+e^{-ik})=-e^{-ik}(1+\mu e^{ik})$, so
   $2\theta_k=\pi-k+\operatorname{Im}\ln(1+\mu e^{ik})=\pi-k+\sum_{m\ge1}\frac{(-1)^{m+1}\mu^m}{m}\sin mk$.
3. Square and integrate over $[0,\pi]$ with $\int_0^\pi(\pi-k)\sin mk\,dk=\pi/m$ and
   $\int_0^\pi\sin mk\sin m'k\,dk=\tfrac\pi2\delta_{mm'}$:
   $c=\tfrac{\pi^2}{24}-\tfrac14\mathrm{Li}_2(-\mu)+\tfrac1{16}\mathrm{Li}_2(\mu^2)$. With
   $\mathrm{Li}_2(\mu^2)=2[\mathrm{Li}_2(\mu)+\mathrm{Li}_2(-\mu)]$ this is $\tfrac{\pi^2}{24}+\tfrac14\chi_2(\mu)$.
4. For $\mu>1$ expand in $x=1/\mu$: $2\theta_k=\pi-\sum_m\frac{(-1)^{m+1}x^m}{m}\sin mk$, and the cross term now needs
   $\int_0^\pi\sin mk\,dk=2/m$ for odd $m$ (zero for even $m$), which produces $-\tfrac12\chi_2(x)$. For $\mu<-1$,
   $2\theta_k=-\sum_m\frac{(-1)^{m+1}x^m}{m}\sin mk$ and only the square term survives.
5. Differentiate with $\chi_2'(x)=\operatorname{artanh}(x)/x$ and $\frac{d}{dx}\mathrm{Li}_2(x^2)=-2\ln(1-x^2)/x$.
:::

The special values are $c(-1)=\pi^2/96=0.102808$, $c(0)=\pi^2/24=0.411234$, $c(1)=7\pi^2/96=0.719659$,
$c(+\infty)=\pi^2/8=1.233701$ (all pairs filled) and $c(-\infty)=0$, with $c'(0)=1/4$. The function $c$ is continuous
and increasing (@fig:kitaev). At the critical points the angles are linear in $k$: $\theta_k=\tfrac\pi2-\tfrac k4$ at
$\mu=1$ and $\theta_k=\tfrac\pi4-\tfrac k4$ at $\mu=-1$, which gives $c(\pm1)$ by an elementary integral. The closed
form matches direct quadrature at 12 values of $\mu$ to $10^{-11}$, and the momentum sum at finite $L$ approaches the
integral with an error $\propto1/L^2$ for $\mu>-1$ and an exponentially small error for $\mu<-1$.

::: {.figure #fig:kitaev live="figures/kitaev.js"}
Gaussian-state complexity per site $c(\mu)$ of the Kitaev ground state, relative to the vacuum (thick,
@eq:bulk-kc), the finite chain with $L=100$ (open circles), and the derivative $c'(\mu)$ (dashed, @eq:bulk-dc),
which diverges logarithmically at $\mu_c=\pm1$.
:::

## The singular part

Near the critical points the derivative has a universal logarithm and a jump.

::: {.proposition #thm:bulk-sing title="Singular part of the derivative"}
With $\delta=\mu-\mu_c$,

$$\frac{dc}{d\mu}=-\frac18\ln\abs{\mu-\mu_c}+A_\pm+O(\delta\ln\abs\delta),$$ {#eq:bulk-sing}

where $A_-=\tfrac{\ln2}8$, $A_+=\tfrac{3\ln2}8$ at $\mu_c=1$ and $A_-=-\tfrac{\ln2}8$, $A_+=\tfrac{\ln2}8$ at
$\mu_c=-1$ (the sign refers to $\delta\gtrless0$). So $c$ is continuous, $c'$ diverges logarithmically with
coefficient $-1/8$, and the regular part jumps by $A_+-A_-=\tfrac{\ln2}{4}$, upwards on the side $\mu>\mu_c$ where the
pair at $k_c$ is filled. For a general reference the coefficient is
$-\frac1{2\pi}\big(\frac\pi4-\theta^R_{k_c}\big)$: $-\tfrac18$ if $\theta^R_{k_c}=0$ and $+\tfrac18$ if
$\theta^R_{k_c}=\tfrac\pi2$.
:::

::: proof
The argument is local in $k$ and does not use the closed form; we give it for $\mu_c=1$.

1. $\partial_\mu\theta_k=\sin k/(2E_k^2)$, so
   $c'=\frac1\pi\int_0^\pi(\theta_k-\theta_k^R)\,\partial_\mu\theta_k\,dk$.
2. Near $k_c$, with $p=\abs{k-k_c}$: $E_k^2\simeq\delta^2+p^2$ and $\partial_\mu\theta_k\simeq p/[2(\delta^2+p^2)]$.
3. $2\theta_k\simeq\operatorname{atan2}(p,-\delta)$, so $\theta_k\to\pi/4$, the critical value, for
   $\abs\delta\ll p\ll1$, while $\theta_k\to0$ ($\delta<0$) or $\pi/2$ ($\delta>0$) as $p\to0$.
4. The window $\abs\delta<p<1$ therefore contributes
   $\frac1\pi\big(\frac\pi4-\theta^R_{k_c}\big)\int_{\abs\delta}^1\frac{dp}{2p}
   =-\frac1{2\pi}\big(\frac\pi4-\theta^R_{k_c}\big)\ln\abs\delta$, which is the logarithm.
5. The jump: at equal $\abs\delta$, $\partial_\mu\theta_k$ is the same on both sides and
   $\theta_+-\theta_-=\arctan(\abs\delta/p)$. With $x=p/\abs\delta=\cot u$,
   $$\begin{aligned}A_+-A_-&=\frac1\pi\int_0^\infty\frac{x\arctan(1/x)}{2(1+x^2)}\,dx\\&=\frac1{2\pi}\int_0^{\pi/2}u\cot u\,du=\frac{\ln2}{4}.\end{aligned}$$
6. The constants follow from @eq:bulk-dc; for instance, as $\mu\to1^-$,
   $\frac{\operatorname{artanh}\mu}{4\mu}\simeq\frac18\ln\frac{2}{1-\mu}$, which gives $A_-=\tfrac{\ln2}8$.
:::

Numerically $\ln2/8=0.0866434$, $3\ln2/8=0.259930$ and $\ln2/4=0.173287$. The closed form obeys @eq:bulk-sing on all
four sides at $\delta=10^{-4},10^{-6},10^{-8}$ with an error below $2\delta\abs{\ln\delta}$, and direct quadrature
gives the same for $\delta\ge10^{-5}$. For the references $\mu_R=3,\ 0.5,\ -3$ the fitted slope is $\pm1/8$ to
$10^{-3}$, as the general formula predicts.

The logarithm has a simple origin. In a momentum window $\abs\delta<p<1$ around $k_c$ the ground state already sits
at the critical angle $\pi/4$, halfway between empty and filled, and each decade of that window adds the same amount
to $c'$. Only the reference angle at $k_c$ enters the coefficient, so the divergence is a property of the transition,
not of the reference, up to its sign. The complexity itself stays continuous: the transition shows up in the first
derivative, as a logarithm with coefficient $\mp\tfrac18$ plus a jump of $\tfrac{\ln2}4$ in the regular part.
