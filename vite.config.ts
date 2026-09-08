import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
      '@server': path.resolve(__dirname, './src/server'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    // Vite dev server (frontend). The backend runs on PORT (default 3000).
    port: 5173,
    strictPort: true,
    proxy: {
      '/trpc': {
        target: `http://localhost:${process.env.PORT || '3000'}`,
        changeOrigin: true,
      },
    },
  },
});
