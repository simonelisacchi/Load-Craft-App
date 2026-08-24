import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Il base path va cambiato con il nome esatto della repo GitHub quando si pubblica
// su GitHub Pages, es: base: '/nome-repo/'
export default defineConfig({
  plugins: [react()],
  base: './',
})
