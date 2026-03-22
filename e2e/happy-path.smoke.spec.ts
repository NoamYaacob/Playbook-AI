import { expect, test, type ConsoleMessage, type Page, type Response } from "@playwright/test";
import { getSmokeTargets } from "./helpers/demo-data";
import { createTempUserWithoutPlaybook, deleteTempUser } from "./helpers/test-users";

const DEMO_EMAIL = "demo@playbookai.app";
const DEMO_PASSWORD = "password123";

function shouldIgnoreConsoleError(message: ConsoleMessage): boolean {
  const text = message.text();
  return (
    text.includes("Download the React DevTools") ||
    text.includes("/_next/webpack-hmr") ||
    text.includes("ERR_INVALID_HTTP_RESPONSE")
  );
}

function shouldIgnoreResponseError(response: Response): boolean {
  const url = response.url();
  return url.includes("__nextjs_original-stack-frame") || url.includes("__nextjs_source-map");
}

async function signInThroughAuthJs(
  page: Page,
  { email = DEMO_EMAIL, password = DEMO_PASSWORD, callbackPath = "/dashboard" }: {
    email?: string;
    password?: string;
    callbackPath?: string;
  } = {},
) {
  const origin = new URL(page.url()).origin;
  const request = page.context().request;
  const csrfResponse = await request.get(`${origin}/api/auth/csrf`);
  expect(csrfResponse.ok()).toBeTruthy();

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrfToken).toBeTruthy();

  const callbackResponse = await request.post(`${origin}/api/auth/callback/credentials`, {
    form: {
      csrfToken: csrfToken!,
      email,
      password,
      callbackUrl: `${origin}${callbackPath}`,
    },
  });

  expect(callbackResponse.ok(), "Expected credentials callback to succeed").toBeTruthy();
}

async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await page.getByLabel(/email address/i).fill(DEMO_EMAIL);
  await page.getByLabel(/^password$/i).fill(DEMO_PASSWORD);
  await signInThroughAuthJs(page);
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
}

function mainContent(page: Page) {
  return page.locator("main");
}

async function expectNoRuntimeErrors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const responseErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !shouldIgnoreConsoleError(message)) {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  page.on("response", (response) => {
    if (response.status() >= 400 && !shouldIgnoreResponseError(response)) {
      responseErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return async () => {
    expect.soft(consoleErrors, "Unexpected browser console errors").toEqual([]);
    expect.soft(pageErrors, "Unexpected browser page errors").toEqual([]);
    expect.soft(responseErrors, "Unexpected network errors").toEqual([]);
  };
}

test("seeded demo happy-path smoke test", async ({ page }) => {
  const assertNoRuntimeErrors = await expectNoRuntimeErrors(page);
  const targets = await getSmokeTargets();

  await loginAsDemo(page);
  await expect(mainContent(page).getByRole("heading", { name: /performance dashboard/i })).toBeVisible();

  await page.locator("aside").getByRole("link", { name: /pre-market/i }).click();
  await expect(page).toHaveURL(/\/pre-market$/);
  await expect(mainContent(page).getByRole("heading", { name: /pre-market analyzer/i })).toBeVisible();
  await expect(
    mainContent(page).getByText(/does not use live market intelligence, does not generate trade signals/i),
  ).toBeVisible();
  await expect(mainContent(page).getByRole("heading", { name: /today checklist/i })).toBeVisible();
  await expect(mainContent(page).getByRole("heading", { name: /placeholder analysis architecture/i })).toBeVisible();
  await expect(mainContent(page).getByText(/overnight structure snapshot/i)).toBeVisible();

  await mainContent(page).getByRole("link", { name: /open active playbook/i }).click();
  await expect(page).toHaveURL(new RegExp(`/playbook/${targets.strategyId}$`));

  await page.goto("/playbook");
  await expect(mainContent(page).getByRole("heading", { name: /strategy playbook/i })).toBeVisible();

  await page.goto(`/playbook/${targets.strategyId}`);
  await expect(mainContent(page).getByRole("heading", { name: targets.strategyTitle })).toBeVisible();

  await page.goto("/import");
  await expect(mainContent(page).getByRole("heading", { name: /import trades/i })).toBeVisible();

  await page.goto("/journal");
  await expect(mainContent(page).getByRole("heading", { name: /trade journal/i })).toBeVisible();

  await page.goto(`/journal/${targets.tradeId}`);
  await expect(mainContent(page).getByRole("heading", { name: /trade reflection/i })).toBeVisible();
  await expect(mainContent(page).getByText("Trade Metrics")).toBeVisible();

  await page.goto(`/import/review/${targets.batchId}`);
  await expect(mainContent(page).getByRole("heading", { name: /trade review/i })).toBeVisible();
  await expect(
    mainContent(page).getByText(/review complete|pattern clusters identified|review skipped/i),
  ).toBeVisible();

  await page.goto("/daily-review");
  await expect(mainContent(page).getByRole("heading", { name: /daily review/i })).toBeVisible();
  await expect(
    mainContent(page).getByRole("button", { name: /save draft|mark complete/i }).first(),
  ).toBeVisible();

  await assertNoRuntimeErrors();
});

test("pre-market empty state renders when no active playbook exists", async ({ page }) => {
  const tempUser = await createTempUserWithoutPlaybook();

  try {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await signInThroughAuthJs(page, {
      email: tempUser.email,
      password: tempUser.password,
      callbackPath: "/pre-market",
    });
    await page.goto("/pre-market");

    await expect(mainContent(page).getByRole("heading", { name: /pre-market analyzer/i })).toBeVisible();
    await expect(mainContent(page).getByText(/no active playbook found/i)).toBeVisible();
    await expect(
      mainContent(page).getByText(/does not create ideas on its own/i),
    ).toBeVisible();
    await expect(
      mainContent(page).getByRole("link", { name: /create your first strategy/i }),
    ).toBeVisible();
  } finally {
    await deleteTempUser(tempUser.id);
  }
});
