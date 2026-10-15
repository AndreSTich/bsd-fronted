import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Разрешаем доступ из локальной сети
    proxy: {
      // Все запросы, начинающиеся с /api, Vite будет перенаправлять на бэкенд
      '/api': {
        target: 'https://localhost:7230',
        secure: false, // Игнорируем ошибку самоподписанного сертификата C#
      }
    }
  }
})