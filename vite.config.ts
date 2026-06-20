import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isNative = process.env.BUILD_TARGET === 'native'

export default defineConfig({
  plugins: [react()],
  base: isNative ? '/' : '/coaching-app/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    sourcemap: false,
  },
})
