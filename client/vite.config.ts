import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// База для GitHub Pages: https://<user>.github.io/ege-obshestvoznanie/
export default defineConfig({
  base: '/ege-obshestvoznanie/',
  plugins: [react()],
})
