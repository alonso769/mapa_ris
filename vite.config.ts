import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // REEMPLAZA ESTO CON EL NOMBRE DE TU REPO
  base: '/mapa_ris/', 

  build: {
    outDir: 'docs', // <--- ESTA ES LA CLAVE: Cambia la salida a 'docs'
  },

  server: {
    host: '0.0.0.0', // Opcional: para ver en red local si lo necesitas
    port: 2005,
  }
})