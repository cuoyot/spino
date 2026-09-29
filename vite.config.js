import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
  // the Android project churns on every APK build; watching it reloads the page and can crash the watcher
  server: { watch: { ignored: ['**/android/**', '**/dist/**', '**/*.apk'] } },
});
