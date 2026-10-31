import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import manifest from './manifest.config.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: { options: 'src/options/index.html', sidepanel: 'src/sidepanel/index.html' },
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
