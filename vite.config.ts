import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/cube-steps/',
  optimizeDeps: { exclude: ['cubing'], include: ['react', 'react-dom/client'] },
  build: {
    // A scramble module worker must never import the React entry or a CSS
    // preload helper that touches document. Keep shared puzzle code separate.
    modulePreload: false,
    cssCodeSplit: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'cubing', test: /node_modules[\\/]cubing[\\/]/, entriesAware: true }],
        },
      },
    },
  },
});
