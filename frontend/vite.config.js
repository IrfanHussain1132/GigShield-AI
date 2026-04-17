import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Enable polling so Docker on Windows correctly detects file changes
    watch: {
      usePolling: true,
    },
    // Allows external access from the Docker host
    host: true, 
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3,
        global_defs: {
          'import.meta.env.MODE': 'production'
        }
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/app') || id.includes('/src/store') || id.includes('/src/utils')) {
            return 'core';
          }
        }
      }
    }
  }
});
