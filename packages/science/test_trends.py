"""Tests for trends.py. Run: .venv/bin/python packages/science/test_trends.py  (pytest-compatible).
Synthetic series here are TEST FIXTURES ONLY, never data."""
from __future__ import annotations

import itertools
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import trends as T  # noqa: E402


def test_mk_variance_matches_exact_permutation_with_ties():
    y = np.array([1.0, 2.0, 2.0, 3.0, 3.0, 3.0, 4.0])
    s_all = [T.mk_s(np.array(p)) for p in itertools.permutations(y)]
    exact = float(np.var(s_all))
    assert math.isclose(T.mk_var(y), exact, rel_tol=1e-9), (T.mk_var(y), exact)


def test_mk_variance_no_ties_formula():
    n = 25
    assert T.mk_var(np.arange(n, dtype=float)) == n * (n - 1) * (2 * n + 5) / 18


def test_perfect_trend():
    t = np.arange(2001, 2026)
    r = T.trend(t, 2.0 * t + 1.0)
    assert math.isclose(r.slope_per_decade, 20.0)
    assert r.p < 1e-6 and r.s == 25 * 24 // 2
    assert r.ci_low_per_decade <= 20.0 <= r.ci_high_per_decade


def test_constant_series_no_trend():
    r = T.trend(np.arange(2001, 2026), np.full(25, 5.0))
    assert r.slope_per_decade == 0 and r.p == 1.0


def test_null_false_positive_rate_and_ci_coverage():
    rng = np.random.default_rng(1)
    t = np.arange(2001, 2026)
    fp = cover = 0
    n_sim = 400
    for _ in range(n_sim):
        y = 0.03 * t + rng.normal(0, 1, 25)
        r = T.trend(t, y)
        cover += r.ci_low_per_decade <= 0.3 <= r.ci_high_per_decade
        fp += T.trend(t, rng.normal(0, 1, 25)).p < 0.05
    assert 0.02 <= fp / n_sim <= 0.09, fp / n_sim
    assert 0.90 <= cover / n_sim <= 0.99, cover / n_sim


def test_hamed_rao_inflates_variance_for_ar1():
    rng = np.random.default_rng(2)
    t = np.arange(60)
    e = np.zeros(60)
    for i in range(1, 60):
        e[i] = 0.8 * e[i - 1] + rng.normal()
    assert T.hamed_rao_factor(t, e, 0.0) > 1.5


def test_autocorr_correction_never_shrinks_variance():
    t = np.arange(2001, 2026, dtype=float)
    y = np.array([0, 3] * 12 + [0], dtype=float) + 0.1 * t  # strongly negative lag-1
    r = T.trend(t, y)
    assert r.hamed_rao_applied and r.hamed_rao_factor >= 1.0
    assert r.var_s >= T.mk_var(y)


def test_seasonal_trend_recovers_known_slope_under_strong_seasonality():
    rng = np.random.default_rng(4)
    yrs = np.repeat(np.arange(2000, 2026), 12).astype(float)
    mon = np.tile(np.arange(1, 13), 26)
    y = 10 * np.sin(2 * np.pi * mon / 12) + 0.05 * (yrs - 2000) + rng.normal(0, 0.3, len(yrs))
    r = T.seasonal_trend(yrs, mon, y)
    assert abs(r["slope_per_decade"] - 0.5) < 0.1 and r["p"] < 0.01


def test_seasonal_trend_null():
    rng = np.random.default_rng(5)
    yrs = np.repeat(np.arange(2000, 2026), 12).astype(float)
    mon = np.tile(np.arange(1, 13), 26)
    hits = sum(T.seasonal_trend(yrs, mon, 5 * np.cos(mon) + rng.normal(0, 1, len(yrs)))["p"] < 0.05 for _ in range(200))
    assert hits / 200 <= 0.09


def test_region_weights_partial_cells():
    sys.path.insert(0, str(Path(__file__).parent))
    import regions as R
    from shapely.geometry import box

    w = R.grid_weights(np.array([0.5, 1.5]), np.array([0.5, 1.5]), box(0, 0, 1.5, 2))
    assert np.isclose(w[0, 0], np.cos(np.radians(0.5)))
    assert np.isclose(w[0, 1], 0.5 * np.cos(np.radians(0.5)))
    mean = R.weighted_mean(np.array([[1.0, 3.0], [1.0, 3.0]]), np.ones((2, 2)))
    assert np.isclose(mean, 2.0)
    assert np.isnan(R.weighted_mean(np.array([[1.0, np.nan], [np.nan, np.nan]]), np.ones((2, 2))))


def test_region_scopes_cover_spain():
    import regions as R

    sc = R.scopes()
    assert "age" in sc and len([k for k in sc if k.startswith("ccaa:")]) == 19
    assert len([k for k in sc if k.startswith("provincia:")]) == 52
    minx, miny, maxx, maxy = sc["age"]["geom"].bounds
    assert miny > 35.5 and minx > -10 and maxx < 4.6  # Canarias excluded from R0


def test_bh_known_values():
    adj = T.benjamini_hochberg([0.01, 0.04, 0.03, 0.20])
    assert np.allclose(adj, [0.04, 0.0533333, 0.0533333, 0.20], atol=1e-6)


def test_kendall_tau_b():
    x = np.arange(10.0)
    assert T.kendall_tau_b(x, x) == 1.0
    assert T.kendall_tau_b(x, -x) == -1.0


def test_mdt_is_finite_and_detects():
    rng = np.random.default_rng(3)
    t = np.arange(2001, 2026)
    y = rng.normal(15, 4, 25)
    mdt = T.minimum_detectable_trend(t, y, n_sim=200)
    assert 0 < mdt < 20


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as e:
                fails += 1
                print("FAIL", name, e)
    sys.exit(1 if fails else 0)
