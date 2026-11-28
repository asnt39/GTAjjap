import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {defineConfig} from 'vite'

const {version} = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig(({command}) => {
  const build = command === 'build'
    ? `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`
    : 'dev'
  const release = JSON.stringify({version, build})

  return {
    define: {__HARBORLINE_RELEASE__: release},
    plugins: [{
      name: 'harborline-release',
      configureServer(server) {
        server.middlewares.use('/version.json', (_request, response) => {
          response.setHeader('Content-Type', 'application/json')
          response.setHeader('Cache-Control', 'no-store')
          response.end(release + '\n')
        })
      },
      generateBundle() {
        this.emitFile({type: 'asset', fileName: 'version.json', source: release + '\n'})
      }
    }]
  }
})
