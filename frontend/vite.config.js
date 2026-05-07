import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          secure: false,
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
          },
        },
        '/socket.io': {
          target: target,
          ws: true,
          changeOrigin: true,
          secure: false,
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
          },
        },
      },
    },
  };
});
