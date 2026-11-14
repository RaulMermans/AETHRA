# Future climate projections — research spec (not a demo feature)

**Status:** P2 / DEFERRED (D15, D38, D63). **Do not display in the challenge demo** until every
gate below passes and a named reviewer signs.

A confidence interval around a historical Theil–Sen slope is **not** a forecast interval. Do not
extend +0.60 °C/decade (CI 0.31–0.87) to 2035 and call it a validated prediction. Do not use a
historical Mann–Kendall p-value to certify model output.

## Proposed horizon

**2032–2040** as a *planning discussion window*, not a validated forecast.
Default first variable: near-surface air temperature (`tas`), because Gate A is our strongest
historical chain.

Candidate NASA source (verify version before any download): **NEX-GDDP-CMIP6**
<https://www.nasa.gov/ames/earth-science/nasa-earth-exchange-nex/gddp/downscaled-climate-projections-nex-gddp-cmip6/>

## Must be defined before implementation

Scientific question · intended decision · variable and units · geographic support · temporal
support · historical reference period · model inclusion rules · SSP selection · ensemble rules ·
bias adjustment · missingness/QA · uncertainty representation · validation method · known
limits · exact claim wording.

Do not pick models or SSPs for the most compelling story.

## Validation gates

Mean bias · seasonality · variability · temporal dependence · extremes if claimed · spatial
agreement · calibration vs validation split · sensitivity to model subset · baseline
comparability · ensemble vs scenario uncertainty (do not label ensemble percentiles as 95% CIs
unless independently justified). Fail → INSUFFICIENT or NOT_AVAILABLE.

## Energy variables

`sfcWind` ≠ POWER WS50M. `rsds` ≠ PV generation. `pr` ≠ reservoir inflow. Grid resolution ≠
parcel. No future MWh without additional validated physical and operational models.

## UI policy

Never mix unlabelled historical series with scenario series. States: HISTORICAL DATA · CLIMATE
SCENARIO · NO VALIDATED PROJECTION. The EnergyCasePanel hatched 2026–2040 band is the last of
these, not a scenario output.
