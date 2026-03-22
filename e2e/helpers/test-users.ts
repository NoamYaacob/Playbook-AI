import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

function createPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for e2e test users.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}

export interface TempUser {
  id: string;
  email: string;
  password: string;
}

export async function createTempUserWithoutPlaybook(): Promise<TempUser> {
  const prisma = createPrisma();
  const email = `premarket-empty-${Date.now()}@playbookai.app`;
  const password = "password123";
  const passwordHash = await hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Pre Market Empty QA",
        onboardingDone: true,
        language: "en",
        timezone: "UTC",
        primaryMarkets: ["FUTURES"],
        accountType: "PERSONAL",
        goals: ["IMPROVE_PLAYBOOK_ADHERENCE"],
      },
      select: { id: true, email: true },
    });

    return {
      id: user.id,
      email: user.email,
      password,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function deleteTempUser(userId: string): Promise<void> {
  const prisma = createPrisma();

  try {
    await prisma.user.delete({ where: { id: userId } });
  } finally {
    await prisma.$disconnect();
  }
}
