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
});
