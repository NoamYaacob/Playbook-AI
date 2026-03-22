// ---------------------------------------------------------------------------
// Onboarding Wizard – Zod Validation Schema
// ---------------------------------------------------------------------------

import { z } from "zod";
import { Market, AccountType, GoalType } from "@/types";

// ---------------------------------------------------------------------------
// Helpers – derive Zod enums from the const objects
// ---------------------------------------------------------------------------

const marketValues = Object.values(Market) as [
  (typeof Market)[keyof typeof Market],
  ...(typeof Market)[keyof typeof Market][],
];

const accountTypeValues = Object.values(AccountType) as [
  (typeof AccountType)[keyof typeof AccountType],
  ...(typeof AccountType)[keyof typeof AccountType][],
];

const goalTypeValues = Object.values(GoalType) as [
  (typeof GoalType)[keyof typeof GoalType],
  ...(typeof GoalType)[keyof typeof GoalType][],
];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const OnboardingSchema = z.object({
  /** Display name for the user */
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters")
    .trim(),

  /** IANA timezone string, e.g. "America/New_York" */
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(
      (tz) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid timezone" },
    ),

  /** At least one market must be selected */
  primaryMarkets: z
    .array(z.enum(marketValues))
    .min(1, "Select at least one market"),

  /** Personal account or prop-firm account */
  accountType: z.enum(accountTypeValues, {
    error: "Select an account type",
  }),

  /** At least one goal must be selected */
  goals: z
    .array(z.enum(goalTypeValues))
    .min(1, "Select at least one goal"),
});

// ---------------------------------------------------------------------------
// Inferred type
// ---------------------------------------------------------------------------

export type OnboardingData = z.infer<typeof OnboardingSchema>;
