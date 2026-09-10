import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'admin-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'admin/index.html',
    },
  },
});
