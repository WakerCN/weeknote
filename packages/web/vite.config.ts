import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 构建产物输出到 CLI 包的 web-dist 目录
  build: {
    outDir: path.resolve(__dirname, '../cli/web-dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 手动分包：将大依赖拆分成独立 chunk
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-monaco': ['@monaco-editor/react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-ui': [
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            'cmdk',
            'lucide-react',
            'sonner',
          ],
          'vendor-utils': ['ahooks', 'axios', 'lodash-es', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
