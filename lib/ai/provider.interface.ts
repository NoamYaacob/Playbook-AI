// ---------------------------------------------------------------------------
// AI Provider Interface
//
// Any AI backend (mock, OpenAI, Anthropic, Gemini, …) must implement this
// interface.  The application layer depends only on this contract, keeping
// provider details isolated.
// ---------------------------------------------------------------------------

import type {
  StrategyAnalysisInput,
  StrategyAnalysisOutput,
  TradeAnalysisInput,
  TradeAnalysisOutput,
  TradeAnalysisOutputV2,
  DailyReviewInput,
  DailyReviewOutput,
  InsightsInput,
  InsightsOutput,
  ClusterSetupInput,
  ClusterSetupOutput,
  SetupClusterInput,
  SetupClusterOutput,
} from "./types";

export interface AIProvider {
  /**
   * Analyses a trading strategy / playbook and returns a structured summary
   * together with improvement suggestions.
   *
   * The output is strictly educational and does not constitute financial advice
   * or trade signals.
   */
  analyzeStrategy(input: StrategyAnalysisInput): Promise<StrategyAnalysisOutput>;

  /**
   * Evaluates a single trade against the user's strategy and returns an
   * adherence verdict, reasoning, and any observed behaviour flags.
   *
   * The output reflects analysis of a user-defined strategy only.  It never
   * produces buy/sell recommendations.
   */
  analyzeTrade(input: TradeAnalysisInput): Promise<TradeAnalysisOutput>;

  /**
   * Extended version of analyzeTrade that additionally returns matched and
   * broken rule strings and a 2-sentence educational coaching note.
   *
   * All output is reflective and process-focused only. No financial advice
   * or trade signals are produced.
   */
  analyzeTradeV2(input: TradeAnalysisInput): Promise<TradeAnalysisOutputV2>;

  /**
   * Produces an educational daily-review summary for a set of trades from one
   * trading day, focusing on process adherence and improvement areas.
   */
  summarizeDailyReview(input: DailyReviewInput): Promise<DailyReviewOutput>;

  /**
   * Generates a set of behavioural and performance insights for a historical
   * trade sample against the user's active strategy.
   */
  generateInsights(input: InsightsInput): Promise<InsightsOutput>;

  /**
   * Clusters a set of reviewed trades by pattern similarity and returns
   * suggested setup labels for each group.
   *
   * Analysis is based entirely on the user's own trade questionnaire answers.
   * No output constitutes financial advice or trade signals.
   */
  clusterSetups(input: ClusterSetupInput): Promise<ClusterSetupOutput>;

  /**
   * Structured setup clustering using the richer SetupClusterInput shape.
   * Inspects whatDidYouSee and setupTrigger fields to group similar trades
   * and suggest named setup clusters.
   *
   * Analysis references only the user's own narrative text. No financial
   * advice or trade signals are produced.
   */
  clusterSetupsV2(input: SetupClusterInput): Promise<SetupClusterOutput>;
}
