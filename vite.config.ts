import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const PRIVATE_DATA_ROUTE = '/__private/field-map-data.json'
const PRIVATE_DATA_FILE = resolve(
  import.meta.dirname,
  'src/field-map/field-map-data.json',
)

function privateFieldMapData(enabled: boolean): Plugin {
  return {
    name: 'private-field-map-data',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== PRIVATE_DATA_ROUTE) return next()

        const remoteAddress = request.socket.remoteAddress
        const isLoopback =
          remoteAddress === '127.0.0.1' ||
          remoteAddress === '::1' ||
          remoteAddress === '::ffff:127.0.0.1'

        if (!isLoopback) {
          response.statusCode = 403
          response.end('Private field map data is available only on localhost')
          return
        }

        if (!enabled || !existsSync(PRIVATE_DATA_FILE)) {
          response.statusCode = 404
          response.end('Private field map data is not available')
          return
        }

        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.end(readFileSync(PRIVATE_DATA_FILE))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const privateDataEnabled = env.VITE_USE_PRIVATE_RESEARCH_DATA === 'true'

  return {
    plugins: [react(), privateFieldMapData(privateDataEnabled)],
  }
})
