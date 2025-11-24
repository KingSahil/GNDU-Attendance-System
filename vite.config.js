import { defineConfig } from 'vite';

export default defineConfig({
    // Base configuration
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    }
});
