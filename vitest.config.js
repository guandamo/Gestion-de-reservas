import { defineConfig, mergeConfig } from 'vite'
import viteConfig from './vite.config.js'

// Config propia para los tests: hereda los plugins y el alias `@` de la app
// (los componentes de `ui/` lo usan) sin tocar `vite.config.js`, que sigue
// siendo la configuración del build de producción.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.test.{js,jsx}'],
    },
  }),
)