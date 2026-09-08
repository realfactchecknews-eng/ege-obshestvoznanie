import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Сайт живёт на своём домене (общага.online) в корне, не под /ege-obshestvoznanie/
export default defineConfig({
  base: '/',
  plugins: [react()],
})
