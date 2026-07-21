/**
 * Browser E2E smoke for Increment 1 (Playwright if available).
 * Falls back to documenting skip when playwright not installed or server down.
 *
 * Run: node scripts/e2e-increment1-browser.mjs
 * Requires: pnpm dev on :3001 and DEMO credentials.
 */
import { spawn } from "node:child_process";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:3001";
const EMAIL = process.env.E2E_EMAIL || "siti.rahayu@msg-os.com";
const PASSWORD = process.env.E2E_PASSWORD || "ProQPay2026!";

async function tryPlaywright() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log(
      JSON.stringify({
        ok: false,
        skipped: true,
        reason: "playwright not installed — run service E2E: pnpm exec tsx scripts/e2e-increment1.ts",
      }),
    );
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { steps: [] };

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 30000 });
    result.steps.push({ step: "open_login", ok: true });

    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|payroll/, { timeout: 20000 }).catch(() => null);
    result.steps.push({ step: "login", url: page.url() });

    await page.goto(`${BASE}/attendance`, { waitUntil: "domcontentloaded" });
    const hasImport = await page.getByText(/Import attendance CSV/i).count();
    result.steps.push({ step: "attendance_import_ui", ok: hasImport > 0 });

    await page.goto(`${BASE}/payroll`, { waitUntil: "domcontentloaded" });
    const hasCreate = await page.getByText(/Create payroll period/i).count();
    const hasSelect = await page.locator("select").count();
    result.steps.push({
      step: "payroll_period_picker",
      ok: hasCreate > 0 && hasSelect > 0,
    });

    // Open first period link if any
    const link = page.locator('a[href^="/payroll/"]').first();
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForLoadState("domcontentloaded");
      const runBtn = await page.getByRole("button", { name: /Run calculation/i }).count();
      const popBtn = await page.getByRole("button", { name: /Build population/i }).count();
      result.steps.push({
        step: "payroll_detail_actions",
        ok: runBtn + popBtn > 0,
        url: page.url(),
      });
    } else {
      result.steps.push({ step: "payroll_detail_actions", ok: false, reason: "no period link" });
    }

    const failed = result.steps.filter((s) => s.ok === false);
    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          base: BASE,
          steps: result.steps,
        },
        null,
        2,
      ),
    );
    if (failed.length) process.exitCode = 1;
  } catch (e) {
    console.log(
      JSON.stringify({
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        steps: result.steps,
        hint: "Start app with pnpm dev and ensure credentials work",
      }),
    );
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

tryPlaywright();
