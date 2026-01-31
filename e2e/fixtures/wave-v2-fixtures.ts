/**
 * Wave V2 Playwright Fixtures
 *
 * Custom fixtures for E2E testing with aerospace safety standards.
 * Provides page objects, authentication helpers, and test utilities.
 */

import { test as base, expect, Page, Locator } from "@playwright/test";

// =============================================================================
// Types
// =============================================================================

export interface User {
  email: string;
  password: string;
  name: string;
  role: "admin" | "operator" | "viewer";
}

export interface TestStory {
  storyId: string;
  title: string;
  expectedElements: string[];
}

// =============================================================================
// Page Object Models
// =============================================================================

export class AuthPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput(): Locator {
    return this.page.getByLabel("Email");
  }

  get passwordInput(): Locator {
    return this.page.getByLabel("Password");
  }

  get loginButton(): Locator {
    return this.page.getByRole("button", { name: /sign in|log in/i });
  }

  get errorMessage(): Locator {
    return this.page.getByRole("alert");
  }

  // Actions
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/.*dashboard|.*home/);
  }

  async expectLoginError(message?: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  // Locators
  get header(): Locator {
    return this.page.getByRole("banner");
  }

  get navigation(): Locator {
    return this.page.getByRole("navigation");
  }

  get mainContent(): Locator {
    return this.page.getByRole("main");
  }

  get userMenu(): Locator {
    return this.page.getByTestId("user-menu");
  }

  // Actions
  async navigateTo(section: string): Promise<void> {
    await this.navigation.getByRole("link", { name: section }).click();
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.page.getByRole("menuitem", { name: /log out|sign out/i }).click();
  }
}

// =============================================================================
// Custom Fixtures
// =============================================================================

type WaveV2Fixtures = {
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  testUser: User;
  authenticatedPage: Page;
};

export const test = base.extend<WaveV2Fixtures>({
  // Auth page fixture
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  // Dashboard page fixture
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  // Test user fixture
  testUser: async ({}, use) => {
    const user: User = {
      email: process.env.TEST_USER_EMAIL || "test@airview.com",
      password: process.env.TEST_USER_PASSWORD || "testpassword123",
      name: "Test User",
      role: "operator"
    };
    await use(user);
  },

  // Pre-authenticated page fixture
  authenticatedPage: async ({ page, testUser }, use) => {
    const authPage = new AuthPage(page);
    await page.goto("/login");
    await authPage.login(testUser.email, testUser.password);
    await authPage.expectLoginSuccess();
    await use(page);
  }
});

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Wait for network idle - useful after navigation
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Take a screenshot with consistent naming for CI
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * Accessibility check helper (integrates with axe-core if installed)
 */
export async function checkAccessibility(page: Page): Promise<void> {
  // Basic keyboard navigation check
  await page.keyboard.press("Tab");
  const focusedElement = page.locator(":focus");
  await expect(focusedElement).toBeVisible();
}

/**
 * Performance timing helper
 */
export async function measurePageLoad(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
}> {
  const timing = await page.evaluate(() => {
    const perf = window.performance;
    const navigation = perf.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const paint = perf.getEntriesByType("paint");

    return {
      loadTime: navigation.loadEventEnd - navigation.startTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      firstPaint: paint.find(p => p.name === "first-paint")?.startTime || 0
    };
  });

  return timing;
}

/**
 * Verify EARS acceptance criteria
 */
export interface EARSCriteria {
  type: "ubiquitous" | "event-driven" | "state-driven" | "optional" | "unwanted";
  trigger?: string;
  condition?: string;
  behavior: string;
}

export async function verifyEARSCriteria(
  page: Page,
  criteria: EARSCriteria,
  verifyFn: () => Promise<boolean>
): Promise<{ passed: boolean; details: string }> {
  const result = await verifyFn();

  const details = [
    `Type: ${criteria.type}`,
    criteria.trigger ? `Trigger: ${criteria.trigger}` : null,
    criteria.condition ? `Condition: ${criteria.condition}` : null,
    `Behavior: ${criteria.behavior}`,
    `Result: ${result ? "PASSED" : "FAILED"}`
  ]
    .filter(Boolean)
    .join("\n");

  return { passed: result, details };
}

// =============================================================================
// Re-exports
// =============================================================================

export { expect } from "@playwright/test";
