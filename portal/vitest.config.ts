// ═══════════════════════════════════════════════════════════════════════════════
// VITEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
// Validated: Vitest Official Coverage Guide - https://vitest.dev/guide/coverage
// Validated: Vitest Coverage Config - https://vitest.dev/config/coverage
//
// Key configurations:
// - v8 provider: "recommended option" per Vitest docs (native JS runtime coverage)
// - 70% thresholds: Industry standard minimum
// - jsdom environment: Required for React component testing
// ═══════════════════════════════════════════════════════════════════════════════

import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],

    // Include patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'server/**/*.{test,spec}.{js,ts}'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache'
    ],

    // Coverage configuration
    // Validated: v8 is "recommended option" per Vitest official docs
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Exclude from coverage
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        'server/__tests__/**'
      ],

      // Industry standard thresholds (70% minimum)
      // Validated: Testing best practices recommend 70-85%
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    },

    // Test timeout
    testTimeout: 10000,

    // Reporter configuration
    reporters: ['default', 'html'],
    outputFile: {
      html: './coverage/test-report.html'
    }
  }
});
