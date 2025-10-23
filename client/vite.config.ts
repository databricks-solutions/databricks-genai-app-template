import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3001,
    },
  },
  build: {
    outDir: 'build',
    // Ensure assets are relative to the base path for flexible deployment
    assetsDir: 'assets',
    // Generate sourcemaps for debugging in production
    sourcemap: true,
    // Optimize chunk size for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-query'],
          'ui-vendor': ['lucide-react', 'recharts'],
        },
      },
    },
  },
  // Base path can be configured for deployment
  // The host app should set this if needed (e.g., '/agent-monitoring/')
  base: './',
})