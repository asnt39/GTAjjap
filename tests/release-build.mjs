import assert from 'node:assert/strict'
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {build} from 'vite'

test('each production build embeds and publishes the same fresh release identifier', async (t) => {
  const configFile = fileURLToPath(new URL('../vite.config.js', import.meta.url))
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const root = await mkdtemp(join(tmpdir(), 'harborline-release-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  const entry = join(root, 'entry.js')
  await writeFile(entry, 'console.log(__HARBORLINE_RELEASE__)\n')

  async function buildFixture() {
    const result = await build({root, configFile, logLevel: 'silent', build: {write: false, rollupOptions: {input: entry}}})
    const serializedRelease = result.output.find(file => file.fileName === 'version.json')?.source
    assert(serializedRelease, 'production output includes version.json')
    const release = JSON.parse(serializedRelease)
    assert.equal(release.version, pkg.version)
    assert.match(release.build, /^[a-z0-9.-]+$/i)
    assert(result.output.some(file => file.type === 'chunk' && file.code.includes(release.build)))
    return release
  }

  assert.notEqual((await buildFixture()).build, (await buildFixture()).build)
})
