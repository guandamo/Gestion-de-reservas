import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo: las back_urls de Mercado Pago apuntan a este origen, así
    // que no puede derivar a 5174 cuando el 5173 esté ocupado.
    port: 5173,
    strictPort: true,
  },
  resolve: {
    // Alias `@` → `src`, requerido por los imports de shadcn/ui
    // (ej. `@/lib/utils` dentro de `src/components/ui/input-otp.jsx`).
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})