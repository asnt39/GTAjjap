import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {runInNewContext} from 'node:vm'

const workerScript = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')

test('the service worker fetches navigation and release metadata without using the HTTP cache', async () => {
  const origin = 'https://playharborline.vercel.app'
  const handlers = new Map()
  const fetched = []
  runInNewContext(workerScript, {
    self: {location: {origin}, addEventListener: (event, handler) => handlers.set(event, handler)},
    URL,
    fetch: async (request, options) => {
      fetched.push({url: request.url, cache: options.cache})
      return new Response('current build')
    }
  })

  for (const [path, mode] of [['/', 'navigate'], ['/version.json', 'same-origin']]) {
    let response
    handlers.get('fetch')({
      request: {url: origin + path, method: 'GET', mode},
      respondWith: result => { response = result }
    })
    assert.equal(await (await response)?.text(), 'current build')
  }
  assert.deepEqual(fetched, [
    {url: origin + '/', cache: 'no-store'},
    {url: origin + '/version.json', cache: 'no-store'}
  ])
})
