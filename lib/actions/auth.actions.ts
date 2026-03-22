"use server";

// ---------------------------------------------------------------------------
// Auth Server Actions
// ---------------------------------------------------------------------------

import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { OnboardingData } from "@/lib/validations/onboarding.schema";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(80).trim().optional(),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<{
  success: boolean;
  user?: { id: string; email: string; name: string | null };
  error?: string;
}> {
  const parsed = RegisterSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password, name } = parsed.data;

  // Check if a user with this email already exists
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hash(password, 12);

  try {
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return { success: true, user };
  } catch (err) {
    console.error("[registerUser]", err);
    return { success: false, error: "Failed to create account. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = LoginSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return { success: false, error: "Invalid email or password" };
  }

  const passwordMatch = await compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { success: false, error: "Invalid email or password" };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  userId: string,
  data: OnboardingData,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        timezone: data.timezone,
        primaryMarkets: data.primaryMarkets,
        accountType: data.accountType,
        goals: data.goals,
        onboardingDone: true,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[completeOnboarding]", err);
    return { success: false, error: "Failed to save onboarding data. Please try again." };
  }
}
