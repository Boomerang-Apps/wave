/**
 * Authentication E2E Tests
 *
 * Wave V2 E2E tests for authentication flows.
 * Story: AUTH-STORY-001 - User Login
 */

import { test, expect, AuthPage, DashboardPage, waitForNetworkIdle } from "./fixtures/wave-v2-fixtures";

test.describe("Authentication", () => {
  test.describe("Login Flow", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);

      await expect(authPage.emailInput).toBeVisible();
      await expect(authPage.passwordInput).toBeVisible();
      await expect(authPage.loginButton).toBeVisible();
    });

    test("should login with valid credentials", async ({ page, testUser }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);
      await authPage.login(testUser.email, testUser.password);
      await authPage.expectLoginSuccess();

      // Verify dashboard is accessible
      const dashboardPage = new DashboardPage(page);
      await expect(dashboardPage.header).toBeVisible();
    });

    test("should show error with invalid credentials", async ({ page }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);
      await authPage.login("invalid@email.com", "wrongpassword");
      await authPage.expectLoginError();
    });

    test("should require email field", async ({ page }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);
      await authPage.passwordInput.fill("somepassword");
      await authPage.loginButton.click();

      // Check for validation message
      await expect(authPage.emailInput).toHaveAttribute("aria-invalid", "true");
    });

    test("should require password field", async ({ page }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);
      await authPage.emailInput.fill("test@email.com");
      await authPage.loginButton.click();

      // Check for validation message
      await expect(authPage.passwordInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  test.describe("Logout Flow", () => {
    test("should logout successfully", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage);

      await dashboardPage.logout();

      // Should redirect to login
      await expect(authenticatedPage).toHaveURL(/.*login/);
    });
  });

  test.describe("Session Management", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test("should persist session across page reloads", async ({ authenticatedPage }) => {
      // Reload the page
      await authenticatedPage.reload();
      await waitForNetworkIdle(authenticatedPage);

      // Should still be on dashboard
      await expect(authenticatedPage).toHaveURL(/.*dashboard|.*home/);
    });
  });

  test.describe("Accessibility", () => {
    test("login form should be keyboard accessible", async ({ page }) => {
      await page.goto("/login");

      // Tab through form elements
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveAttribute("type", "email");

      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveAttribute("type", "password");

      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveRole("button");
    });

    test("form should have proper labels", async ({ page }) => {
      await page.goto("/login");

      const authPage = new AuthPage(page);

      // Check that inputs have associated labels
      await expect(authPage.emailInput).toHaveAccessibleName(/email/i);
      await expect(authPage.passwordInput).toHaveAccessibleName(/password/i);
    });
  });
});

test.describe("EARS Criteria Verification - AUTH-STORY-001", () => {
  /**
   * EARS Format: WHEN {trigger} IF {condition} THEN {behavior}
   */

  test("WHEN user submits valid credentials THEN user is redirected to dashboard", async ({
    page,
    testUser
  }) => {
    // Trigger: User submits login form
    await page.goto("/login");
    const authPage = new AuthPage(page);
    await authPage.login(testUser.email, testUser.password);

    // Behavior: User is redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard|.*home/);
  });

  test("WHEN user submits invalid credentials THEN error message is displayed", async ({
    page
  }) => {
    // Trigger: User submits login form with invalid credentials
    await page.goto("/login");
    const authPage = new AuthPage(page);
    await authPage.login("invalid@email.com", "wrongpassword");

    // Behavior: Error message is displayed
    await expect(authPage.errorMessage).toBeVisible();
  });

  test("WHEN user clicks logout THEN session is terminated AND user is redirected to login", async ({
    authenticatedPage
  }) => {
    // Trigger: User clicks logout
    const dashboardPage = new DashboardPage(authenticatedPage);
    await dashboardPage.logout();

    // Behavior: User is redirected to login
    await expect(authenticatedPage).toHaveURL(/.*login/);

    // Verify session is terminated by trying to access protected route
    await authenticatedPage.goto("/dashboard");
    await expect(authenticatedPage).toHaveURL(/.*login/);
  });
});
