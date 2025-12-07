import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Allows deployment to subdirectories (like GitHub Pages)
  build: {
    outDir: 'dist',
  },
});