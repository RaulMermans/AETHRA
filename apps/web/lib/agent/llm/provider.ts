export type LlmJson = Record<string, unknown>;

export type LlmCompleteRequest = {
  system: string;
  user: string;
  /** Hint only. The provider must still return JSON. */
  schemaName: string;
};

export type LlmProvider = {
  id: string;
  configured: boolean;
  completeJson: (request: LlmCompleteRequest) => Promise<LlmJson>;
};

export const disabledLlmProvider: LlmProvider = {
  id: "disabled",
  configured: false,
  completeJson: async () => {
    throw new Error("LLM is not configured");
  },
};
