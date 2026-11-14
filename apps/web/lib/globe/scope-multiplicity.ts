import { EXPLORATORY_FEATURES_ENABLED } from "@/lib/demo-mode";
import type { DimensionId, EvidenceOutcome } from "./climate";

/**
 * D53 presentation policy (not a change to Python significance).
 * After BH across ~72 UI scopes, temperature Supported labels all hold; rain and
 * rain-anomaly labels do not; modelled runoff almost never does. Until the team
 * approves a pipeline rule, the judge-facing Trend panel must not promote
 * unadjusted Supported badges for non-temperature dimensions.
 */
export function judgePromotesUnadjustedSupport(dimension: DimensionId): boolean {
  if (EXPLORATORY_FEATURES_ENABLED) return true;
  return dimension === "temperature";
}

export function presentedOutcome(
  dimension: DimensionId,
  outcome: EvidenceOutcome,
): EvidenceOutcome | "exploratory_unadjusted" {
  if (
    !judgePromotesUnadjustedSupport(dimension) &&
    (outcome === "supported_increase" || outcome === "supported_decrease")
  ) {
    return "exploratory_unadjusted";
  }
  return outcome;
}
