import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test files pattern
    include: ['tests/**/*.{test,spec}.{ts,js}'],

    // Environment for testing
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        'src/**/*.{test,spec}.{ts,js}',
        'src/types/**',
        'dist/**'
      ]
    },

    // Timeout settings
    testTimeout: 10000,

    // Reporter configuration for cleaner output
    reporter: ['default'],

    // Disable globals to avoid conflicts
    globals: false,

    // Suppress console output during tests
    silent: false,

    // Setup files to run before tests
    setupFiles: [],
  },
})