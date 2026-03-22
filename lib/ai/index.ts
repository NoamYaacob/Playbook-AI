// ---------------------------------------------------------------------------
// AI – Active Provider Export
//
// The active provider is selected via the AI_PROVIDER environment variable.
// Currently supported values:
//
//   "mock"  (default) – returns hardcoded, realistic-looking responses
//
// Future providers (e.g. "openai", "anthropic") can be added here without
// changing any call-sites in the application – they just need to implement
// AIProvider.
// ---------------------------------------------------------------------------

import type { AIProvider } from "./provider.interface";
import { mockAIProvider } from "./mock.provider";

const providerName = process.env.AI_PROVIDER ?? "mock";

function resolveProvider(): AIProvider {
  switch (providerName) {
    case "mock":
      return mockAIProvider;

    // Placeholders for future providers:
    // case "openai":
    //   return openAIProvider;
    // case "anthropic":
    //   return anthropicProvider;

    default:
      console.warn(
        `[ai] Unknown AI_PROVIDER "${providerName}". Falling back to "mock".`,
      );
      return mockAIProvider;
  }
}

/** The active AI provider singleton. */
export const ai: AIProvider = resolveProvider();

export type { AIProvider } from "./provider.interface";
export type {
  StrategyAnalysisInput,
  StrategyAnalysisOutput,
  TradeAnalysisInput,
  TradeAnalysisOutput,
  DailyReviewInput,
  DailyReviewOutput,
  InsightsInput,
  InsightsOutput,
  InsightItem,
  ClusterSetupInput,
  ClusterSetupOutput,
  ClusterSetupItem,
} from "./types";
