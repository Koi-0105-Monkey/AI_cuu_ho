import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174 // Dùng cổng 5174 để không đè lên port 5173 của rescuelink-web
  }
});
