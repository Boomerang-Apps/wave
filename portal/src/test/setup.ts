// ═══════════════════════════════════════════════════════════════════════════════
// VITEST TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════════
// Global test configuration and mocks for the WAVE Portal test suite.
// ═══════════════════════════════════════════════════════════════════════════════

import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Global Mocks
// ─────────────────────────────────────────────────────────────────────────────

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
};
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

// Mock console.error to catch React warnings (optional)
const originalConsoleError = console.error;
vi.spyOn(console, 'error').mockImplementation((...args) => {
  // Filter out known React warnings in tests
  const message = args[0]?.toString() || '';
  if (
    message.includes('Warning:') &&
    (message.includes('act(...)') || message.includes('React does not recognize'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();

  // Reset fetch mock
  (global.fetch as ReturnType<typeof vi.fn>).mockReset();

  // Reset localStorage mock
  (localStorageMock.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

// Helper to mock successful fetch responses
export function mockFetchSuccess(data: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  });
}

// Helper to mock failed fetch responses
export function mockFetchError(error: string, status = 500) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
    text: () => Promise.resolve(error)
  });
}

// Helper to mock network errors
export function mockNetworkError(message = 'Network error') {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(message));
}
