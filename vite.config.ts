import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET
  const devServerPort = Number(env.VITE_DEV_SERVER_PORT || 5173)
  const base = env.VITE_APP_BASE_PATH || '/'

  return {
    base,
    envPrefix: ['VITE_', 'TEST_'],
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: {
      // 固定使用 .env 中声明的开发端口，避免 Vite 自动漂移到其他端口。
      port: Number.isFinite(devServerPort) && devServerPort > 0 ? devServerPort : 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
