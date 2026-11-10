import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * - "npm run dev": servidor de desarrollo en http://localhost:5173 que reenvía /api y /uploads
 *   al backend de CodeIgniter (php spark serve en el puerto 8080). Así no hace falta CORS.
 * - "npm run build": compila la app dentro de backend/public/app, de donde la sirve CodeIgniter.
 */
const BACKEND = process.env.BUZON_BACKEND || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../backend/public/app',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
    },
  },
});
