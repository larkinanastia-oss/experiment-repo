import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works under any GitHub Pages sub-path.
// Output goes to ./demo, which is committed and served by GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'demo', emptyOutDir: true },
})
