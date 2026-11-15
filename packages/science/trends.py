"""Trend statistics for annual series (NumPy only, no SciPy dependency).

All functions are pure and tested in test_trends.py. Conventions:
- `t` in years, slopes returned per year (callers convert to per decade).
- Two-sided tests. p-values from the normal approximation with continuity correction.

References: Mann (1945); Kendall (1975); Sen (1968); Gilbert (1987) for the Sen CI;
Hamed & Rao (1998) for the autocorrelation-corrected variance; Benjamini & Hochberg (1995).
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass

import numpy as np

Z975 = 1.959963984540054


def norm_sf2(z: float) -> float:
    """Two-sided p-value for a standard-normal statistic."""
    return math.erfc(abs(z) / math.sqrt(2.0))


def _clean(t, y):
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    m = np.isfinite(t) & np.isfinite(y)
    return t[m], y[m]


def mk_s(y: np.ndarray) -> int:
    y = np.asarray(y, dtype=float)
    d = np.sign(y[None, :] - y[:, None])
    return int(np.triu(d, 1).sum())


def mk_var(y: np.ndarray) -> float:
    """Variance of S under H0 with the ties correction."""
    y = np.asarray(y, dtype=float)
    n = len(y)
    _, counts = np.unique(y, return_counts=True)
    ties = sum(c * (c - 1) * (2 * c + 5) for c in counts if c > 1)
    return (n * (n - 1) * (2 * n + 5) - ties) / 18.0


def _z(s: int, var: float) -> float:
    if var <= 0 or s == 0:
        return 0.0
    return (s - math.copysign(1, s)) / math.sqrt(var)


def theil_sen(t, y, var_s: float | None = None):
    """Median pairwise slope, intercept (median of y - b t), Gilbert 95% CI."""
    t, y = _clean(t, y)
    i, j = np.triu_indices(len(t), 1)
    dt = t[j] - t[i]
    ok = dt != 0
    slopes = np.sort((y[j] - y[i])[ok] / dt[ok])
    b = float(np.median(slopes))
    a = float(np.median(y - b * t))
    var_s = mk_var(y) if var_s is None else var_s
    n_s = len(slopes)
    c = Z975 * math.sqrt(max(var_s, 0.0))
    m1 = (n_s - c) / 2.0  # 1-indexed rank of the lower limit
    m2 = (n_s + c) / 2.0 + 1  # 1-indexed rank of the upper limit
    idx = np.arange(1, n_s + 1)
    lo = float(np.interp(m1, idx, slopes))
    hi = float(np.interp(m2, idx, slopes))
    return b, a, lo, hi


def acf(x: np.ndarray, k: int) -> float:
    x = np.asarray(x, dtype=float) - np.mean(x)
    den = float(np.sum(x * x))
    if den == 0 or k >= len(x):
        return 0.0
    return float(np.sum(x[k:] * x[:-k]) / den)


def _ranks(x: np.ndarray) -> np.ndarray:
    """Average ranks (1-based), ties share the mean rank."""
    x = np.asarray(x, dtype=float)
    order = np.argsort(x, kind="mergesort")
    r = np.empty(len(x))
    r[order] = np.arange(1, len(x) + 1)
    for v in np.unique(x):
        m = x == v
        if m.sum() > 1:
            r[m] = r[m].mean()
    return r


def hamed_rao_factor(t, y, slope: float) -> float:
    """n/n* from Hamed & Rao (1998): ranks of the detrended series, significant lags only."""
    t, y = _clean(t, y)
    n = len(y)
    r = _ranks(y - slope * t)
    bound = Z975 / math.sqrt(n)
    s = 0.0
    for k in range(1, n - 2):
        rho = acf(r, k)
        if abs(rho) > bound:
            s += (n - k) * (n - k - 1) * (n - k - 2) * rho
    factor = 1.0 + 2.0 / (n * (n - 1) * (n - 2)) * s
    return max(factor, 1e-6)


@dataclass
class TrendResult:
    n: int
    slope_per_decade: float
    ci_low_per_decade: float
    ci_high_per_decade: float
    intercept: float
    s: int
    var_s: float
    z: float
    p: float
    lag1_autocorr: float
    autocorr_bound: float
    hamed_rao_applied: bool
    hamed_rao_factor: float
    method: str

    def to_dict(self) -> dict:
        return {k: (round(v, 6) if isinstance(v, float) else v) for k, v in asdict(self).items()}


def trend(t, y) -> TrendResult:
    """Theil-Sen + Mann-Kendall (ties-corrected). Hamed-Rao variance correction is applied
    when the lag-1 autocorrelation of the Sen-detrended series is outside +/-1.96/sqrt(n)."""
    t, y = _clean(t, y)
    n = len(y)
    if n < 6:
        raise ValueError(f"need at least 6 values, got {n}")
    s = mk_s(y)
    var0 = mk_var(y)
    b0 = theil_sen(t, y, var0)[0]
    r1 = acf(y - b0 * t, 1)
    bound = Z975 / math.sqrt(n)
    applied = abs(r1) > bound
    # Floor at 1: the correction may only inflate the variance (conservative). Negative
    # autocorrelation otherwise shrinks it implausibly (seen: factor 0.024 at n = 25). Amendment A3.
    factor = max(hamed_rao_factor(t, y, b0), 1.0) if applied else 1.0
    var = var0 * factor
    b, a, lo, hi = theil_sen(t, y, var)
    z = _z(s, var)
    return TrendResult(
        n=n,
        slope_per_decade=b * 10,
        ci_low_per_decade=lo * 10,
        ci_high_per_decade=hi * 10,
        intercept=a,
        s=s,
        var_s=var,
        z=z,
        p=norm_sf2(z),
        lag1_autocorr=r1,
        autocorr_bound=bound,
        hamed_rao_applied=applied,
        hamed_rao_factor=factor,
        method="Theil-Sen slope + Gilbert 95% CI; Mann-Kendall (ties-corrected), "
        + ("Hamed-Rao variance correction" if applied else "no autocorrelation correction needed"),
    )


def seasonal_trend(years, months, y) -> dict:
    """Hirsch (1982) seasonal Mann-Kendall + seasonal Sen slope on a monthly series.
    S and Var(S) are summed over the 12 calendar months (ties-corrected per month);
    the slope is the median of within-month pairwise slopes. Serial dependence between
    months is not corrected (diagnostic use)."""
    years = np.asarray(years, float)
    months = np.asarray(months)
    y = np.asarray(y, float)
    s_tot, v_tot, slopes = 0, 0.0, []
    for m in np.unique(months):
        k = (months == m) & np.isfinite(y)
        tm, ym = years[k], y[k]
        if len(ym) < 3:
            continue
        s_tot += mk_s(ym)
        v_tot += mk_var(ym)
        i, j = np.triu_indices(len(tm), 1)
        slopes.append((ym[j] - ym[i]) / (tm[j] - tm[i]))
    z = _z(s_tot, v_tot)
    return {
        "slope_per_decade": float(np.median(np.concatenate(slopes))) * 10,
        "s": int(s_tot),
        "z": z,
        "p": norm_sf2(z),
        "method": "Seasonal Mann-Kendall (Hirsch 1982) + seasonal Sen slope, 12 calendar months",
    }


def benjamini_hochberg(p) -> np.ndarray:
    p = np.asarray(p, dtype=float)
    m = len(p)
    order = np.argsort(p)
    adj = p[order] * m / np.arange(1, m + 1)
    adj = np.minimum.accumulate(adj[::-1])[::-1]
    out = np.empty(m)
    out[order] = np.minimum(adj, 1.0)
    return out


def kendall_tau_b(x, y) -> float:
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    m = np.isfinite(x) & np.isfinite(y)
    x, y = x[m], y[m]
    i, j = np.triu_indices(len(x), 1)
    dx = np.sign(x[j] - x[i])
    dy = np.sign(y[j] - y[i])
    num = float(np.sum(dx * dy))
    den = math.sqrt(float(np.sum(dx != 0)) * float(np.sum(dy != 0)))
    return num / den if den else float("nan")


@dataclass(frozen=True)
class RankCorrelationResult:
    """Spearman rho of Theil–Sen residuals with a two-sided permutation p-value."""

    rho: float
    p_value: float
    n: int
    n_permutations: int

    def to_dict(self) -> dict:
        return asdict(self)


def theil_sen_residuals(t, y) -> np.ndarray:
    """y minus its own Theil–Sen line (removes the shared-trend part before correlating)."""
    t = np.asarray(t, dtype=float)
    y = np.asarray(y, dtype=float)
    b, a, _, _ = theil_sen(t, y)
    return y - (a + b * t)


def _spearman(x: np.ndarray, y: np.ndarray) -> float:
    rx = _ranks(x) - (len(x) + 1) / 2.0
    ry = _ranks(y) - (len(y) + 1) / 2.0
    den = math.sqrt(float(np.sum(rx * rx)) * float(np.sum(ry * ry)))
    return float(np.sum(rx * ry)) / den if den else float("nan")


def detrended_rank_correlation(
    t, x, y, n_permutations: int = 9999, seed: int = 0
) -> RankCorrelationResult | None:
    """Interannual co-variability of two annual series (docs/RELATIONSHIP_MAPS.md).

    Each series is detrended by its own Theil–Sen line, then Spearman rho of the residuals is
    tested against `n_permutations` random pairings (two-sided, p = (k + 1) / (N + 1)).
    Returns None when fewer than 3 paired years remain or a residual series is constant.
    """
    t = np.asarray(t, dtype=float)
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    m = np.isfinite(t) & np.isfinite(x) & np.isfinite(y)
    t, x, y = t[m], x[m], y[m]
    n = len(t)
    if n < 3:
        return None
    rx = _ranks(theil_sen_residuals(t, x)) - (n + 1) / 2.0
    ry = _ranks(theil_sen_residuals(t, y)) - (n + 1) / 2.0
    den = math.sqrt(float(np.sum(rx * rx)) * float(np.sum(ry * ry)))
    if den == 0:
        return None
    rho = float(np.sum(rx * ry)) / den
    rng = np.random.default_rng(seed)
    perms = np.argsort(rng.random((n_permutations, n)), axis=1)
    null = (ry[perms] @ rx) / den
    k = int(np.sum(np.abs(null) >= abs(rho) - 1e-12))
    return RankCorrelationResult(rho=rho, p_value=(k + 1) / (n_permutations + 1), n=n, n_permutations=n_permutations)


def minimum_detectable_trend(t, y, alpha: float = 0.05, power: float = 0.8, n_sim: int = 400, seed: int = 0) -> float:
    """Smallest |slope| per decade detected by MK with the given power, simulated by adding a
    linear trend to permutations of the observed Sen residuals (keeps their distribution,
    ignores autocorrelation). Returns NaN if not reached within 20x the residual spread per decade."""
    t, y = _clean(t, y)
    rng = np.random.default_rng(seed)
    b = theil_sen(t, y)[0]
    resid = y - b * t
    resid = resid - np.median(resid)
    tc = t - t.mean()
    sd = float(np.std(resid)) or 1.0
    span = t.max() - t.min()

    def detect_rate(slope_yr: float) -> float:
        hits = 0
        for _ in range(n_sim):
            yy = rng.permutation(resid) + slope_yr * tc
            z = _z(mk_s(yy), mk_var(yy))
            hits += norm_sf2(z) < alpha
        return hits / n_sim

    lo, hi = 0.0, 20 * sd / max(span, 1)  # per year
    if detect_rate(hi) < power:
        return float("nan")
    for _ in range(14):
        mid = (lo + hi) / 2
        if detect_rate(mid) >= power:
            hi = mid
        else:
            lo = mid
    return hi * 10  # per decade
