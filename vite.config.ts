import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // SECCIÓN AÑADIDA PARA FORZAR LA EXPOSICIÓN EN LA RED
  server: {
    host: '10.0.21.76', // La IP que deseas exponer
    port: 2005,        // El puerto que deseas usar
  }
})