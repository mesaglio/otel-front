import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// @ts-ignore - Vitest extends Vite config
export default defineConfig({
  plugins: [react()],
  // @ts-expect-error - test is a Vitest-specific property
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

