import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'WooAIWidget',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // Inline all dependencies into a single file
        inlineDynamicImports: true,
        // Don't create separate CSS file - we'll inject styles via JS
        assetFileNames: 'widget.[ext]',
      },
    },
    // Minify for production (use esbuild, which is bundled with Vite)
    minify: 'esbuild',
    // Single file output
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
