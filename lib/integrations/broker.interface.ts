// ---------------------------------------------------------------------------
// Broker Integration Provider Interface
//
// Any broker or trade data provider integration must implement BrokerProvider.
// Secrets (API keys, OAuth tokens) are never stored here — they live in
// environment variables or a dedicated secrets manager.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Normalised domain types
// ---------------------------------------------------------------------------

/** A single trade record normalised from a broker's native format. */
export interface BrokerTrade {
  /** External broker-assigned trade / order ID. */
  externalId: string;
  /** Ticker symbol as reported by the broker. */
  symbol: string;
  /** "LONG" or "SHORT" direction. */
  side: "LONG" | "SHORT";
  /** UTC timestamp of trade entry. */
  entryAt: Date;
  /** UTC timestamp of trade exit (null if still open). */
  exitAt: Date | null;
  /** Average fill price at entry. */
  entryPrice: number;
  /** Average fill price at exit (null if still open). */
  exitPrice: number | null;
  /** Position size (contracts, shares, lots, etc.). */
  size: number;
  /** Commissions and fees for this trade. */
  fees: number;
  /** Realised P&L in account currency (null if still open). */
  pnlAmount: number | null;
  /** Asset class / market type (e.g. "FUTURES", "STOCKS"). */
  assetClass: string;
  /** True if the position is still open at time of sync. */
  isOpen: boolean;
  /** Arbitrary extra fields returned by the broker that don't map to standard fields. */
  rawMetadata?: Record<string, unknown>;
}

/** A single account record from the broker. */
export interface BrokerAccount {
  /** Broker-assigned account identifier. */
  accountId: string;
  /** Human-readable display name for the account. */
  displayName: string;
  /** Account currency code (e.g. "USD", "GBP"). */
  currency: string;
  /** Current account balance (null if not available). */
  balance: number | null;
  /** True if the account is the currently active / primary account. */
  isPrimary: boolean;
}

/** Result returned after a trade sync operation. */
export interface SyncResult {
  /** Number of new trades successfully imported. */
  imported: number;
  /** Number of trades that were skipped (duplicates or out of range). */
  skipped: number;
  /** Human-readable error messages for trades that failed to import. */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface BrokerProvider {
  /** Unique slug identifier for this provider (e.g. "tradovate"). */
  readonly slug: string;
  /** Human-readable display name shown in the UI (e.g. "Tradovate"). */
  readonly displayName: string;

  /**
   * Establishes a connection to the broker using the supplied configuration.
   * Config values are provider-specific (e.g. { apiKey, accountId }).
   * Secrets should be passed via environment variables, not stored directly.
   */
  connect(config: Record<string, string>): Promise<void>;

  /**
   * Terminates the active connection and clears any cached credentials.
   */
  disconnect(): Promise<void>;

  /**
   * Returns the list of accounts available under the connected credentials.
   */
  getAccounts(): Promise<BrokerAccount[]>;

  /**
   * Fetches and normalises trades for the given account, optionally filtered
   * to trades on or after `since`. Returns a SyncResult summary.
   */
  syncTrades(accountId: string, since?: Date): Promise<SyncResult>;

  /**
   * Returns true if the provider currently has an active connection.
   */
  isConnected(): boolean;
}

// ---------------------------------------------------------------------------
// Registry type
// ---------------------------------------------------------------------------

/** A map from provider slug to its BrokerProvider implementation. */
export type BrokerProviderRegistry = Record<string, BrokerProvider>;

// ---------------------------------------------------------------------------
// Supported brokers catalogue
// ---------------------------------------------------------------------------

/** Static catalogue of supported (or coming-soon) broker integrations. */
export const SUPPORTED_BROKERS = [
  {
    slug: "tradovate",
    displayName: "Tradovate",
    status: "coming_soon",
  },
  {
    slug: "ninjatrader",
    displayName: "NinjaTrader",
    status: "coming_soon",
  },
  {
    slug: "interactive-brokers",
    displayName: "Interactive Brokers",
    status: "coming_soon",
  },
  {
    slug: "tradingview",
    displayName: "TradingView",
    status: "coming_soon",
  },
  {
    slug: "thinkorswim",
    displayName: "thinkorswim (TD Ameritrade)",
    status: "coming_soon",
  },
  {
    slug: "tastytrade",
    displayName: "tastytrade",
    status: "coming_soon",
  },
] as const;

export type SupportedBrokerSlug =
  (typeof SUPPORTED_BROKERS)[number]["slug"];
