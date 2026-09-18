import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: la build gira sia alla radice di un dominio sia in una
  // sottocartella, senza dover sapere in anticipo dove verrà messa.
  base: './',
  build: { assetsDir: 'assets', target: 'es2020' },
});
