import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: '/cube-steps/', optimizeDeps: {exclude:['cubing'],include:['react','react-dom/client']} });
