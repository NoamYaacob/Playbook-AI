// ---------------------------------------------------------------------------
// Chart Data Provider Interface
//
// Any external OHLCV / chart data source must implement ChartDataProvider.
// This keeps the application layer decoupled from specific market data APIs.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// OHLCV bar
// ---------------------------------------------------------------------------

/** A single OHLCV price bar returned by the data provider. */
export interface OHLCVBar {
  /** Unix timestamp in seconds (UTC). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Trading volume for the bar (optional — not all providers supply it). */
  volume?: number;
}

// ---------------------------------------------------------------------------
// Symbol search result
// ---------------------------------------------------------------------------

export interface SymbolSearchResult {
  /** Ticker symbol (e.g. "AAPL", "ES1!", "EURUSD"). */
  symbol: string;
  /** Human-readable description of the instrument. */
  description: string;
  /** Exchange or data source (e.g. "NASDAQ", "CME", "OANDA"). */
  exchange: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface ChartDataProvider {
  /** Unique slug identifier for this provider (e.g. "polygon"). */
  readonly slug: string;
  /** Human-readable display name shown in the UI (e.g. "Polygon.io"). */
  readonly displayName: string;

  /**
   * Fetches OHLCV bars for the given symbol and timeframe between `from` and
   * `to` (UTC). Timeframe follows TradingView convention: "1", "5", "15",
   * "60", "D", "W".
   */
  getBars(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date,
  ): Promise<OHLCVBar[]>;

  /**
   * Searches for symbols matching the query string. Returns up to 20 results.
   */
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;

  /**
   * Returns true if the provider is configured and available for use.
   * A provider may be unavailable if required API keys are missing.
   */
  isAvailable(): boolean;
}

// ---------------------------------------------------------------------------
// Supported chart data providers catalogue
// ---------------------------------------------------------------------------

export const SUPPORTED_CHART_PROVIDERS = [
  {
    slug: "tradingview-datafeed",
    displayName: "TradingView",
    status: "coming_soon",
  },
  {
    slug: "polygon",
    displayName: "Polygon.io",
    status: "coming_soon",
  },
] as const;

export type SupportedChartProviderSlug =
  (typeof SUPPORTED_CHART_PROVIDERS)[number]["slug"];
