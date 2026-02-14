import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3005,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk - React and core dependencies (rarely changes)
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // UI library chunk - Radix UI components (rarely changes)
          ui: [
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            'lucide-react',
          ],
          // Backend services chunk - Supabase and Slack (rarely changes)
          services: [
            '@supabase/supabase-js',
            '@slack/web-api',
          ],
          // Validation chunk - AJV and formats (rarely changes)
          validation: [
            'ajv',
            'ajv-formats',
          ],
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 600,
  },
})
