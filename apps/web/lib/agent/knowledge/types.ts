export const SOURCE_TIERS = ["A", "B", "C", "D", "E"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export const CLAIM_TYPES = [
  "DEFINITION",
  "PHYSICAL_MECHANISM",
  "SCIENTIFIC_FINDING",
  "REGULATORY_FACT",
  "DESCRIPTIVE_PATTERN",
  "HYPOTHESIS",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const SCIENTIFIC_STATUSES = [
  "VALIDATED",
  "DOCUMENTED_GENERAL_KNOWLEDGE",
  "DESCRIPTIVE",
  "EXPLORATORY",
  "INSUFFICIENT",
  "SUPERSEDED",
] as const;
export type ScientificStatus = (typeof SCIENTIFIC_STATUSES)[number];

export const RELATION_KINDS = [
  "PHYSICAL_MECHANISM",
  "STATISTICAL_ASSOCIATION",
  "MATHEMATICAL_DEFINITION",
  "EMPIRICAL_OBSERVATION",
  "OPERATIONAL_DEPENDENCY",
  "HYPOTHESIS",
  "CAUSAL_CLAIM",
  "UNSUPPORTED",
] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

export const RECOMMENDATION_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type RecommendationLevel = (typeof RECOMMENDATION_LEVELS)[number];

export type KnowledgeSource = {
  id: string;
  tier: SourceTier;
  title: string;
  locator: string;
  dated?: string;
  notes: string;
};

export type KnowledgeConcept = {
  id: string;
  name: string;
  synonyms: readonly string[];
  definition: string;
  units?: string;
  spatialSupport?: string;
  limitations: readonly string[];
};

export type KnowledgeRelation = {
  from: string;
  to: string;
  kind: RelationKind;
  qualification: string;
};

export type KnowledgeClaim = {
  id: string;
  claimType: ClaimType;
  text: string;
  textEs: string;
  subjectIds: readonly string[];
  sourceIds: readonly string[];
  evidenceId?: string;
  scientificStatus: ScientificStatus;
  limitations: readonly string[];
  maxRecommendationLevel: RecommendationLevel;
};
