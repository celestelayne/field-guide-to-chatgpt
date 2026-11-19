import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const PRIVATE_DATA_FILES = new Map([
  [
    '/__private/field-map-data.json',
    resolve(import.meta.dirname, 'src/field-map/field-map-data.json'),
  ],
  [
    '/__private/archaeology-report.json',
    resolve(
      import.meta.dirname,
      'research/private/ai-native-design-engineering-report.json',
    ),
  ],
])

function privateResearchData(enabled: boolean): Plugin {
  return {
    name: 'private-research-data',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const dataFile = request.url
          ? PRIVATE_DATA_FILES.get(request.url)
          : undefined
        if (!dataFile) return next()

        const remoteAddress = request.socket.remoteAddress
        const isLoopback =
          remoteAddress === '127.0.0.1' ||
          remoteAddress === '::1' ||
          remoteAddress === '::ffff:127.0.0.1'

        if (!isLoopback) {
          response.statusCode = 403
          response.end('Private research data is available only on localhost')
          return
        }

        if (!enabled || !existsSync(dataFile)) {
          response.statusCode = 404
          response.end('Private research data is not available')
          return
        }

        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.end(readFileSync(dataFile))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const privateDataEnabled = env.VITE_USE_PRIVATE_RESEARCH_DATA === 'true'

  return {
    plugins: [react(), privateResearchData(privateDataEnabled)],
  }
})
