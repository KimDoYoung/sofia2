import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  base: '/sofia/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('ag-grid')) {
              return 'vendor-ag-grid';
            }
            if (id.includes('@milkdown') || id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/sofia/api': {
        target: 'http://localhost:9595',
        changeOrigin: true,
      },
      '/sofia/health': {
        target: 'http://localhost:9595',
        changeOrigin: true,
      }
    }
  },
})
