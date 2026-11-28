import assert from 'node:assert/strict'
import {setImmediate} from 'node:timers/promises'
import {test} from 'node:test'

const current = {version: '0.1.0', build: 'old-build'}
const latest = {version: '0.1.0', build: 'new-build'}

async function boot({storage = new Map(), served = latest, hidden = false, update} = {}) {
  const {createAppUpdates} = await import('../src/app-updates.js')
  const page = new EventTarget()
  const document = new EventTarget()
  document.hidden = hidden
  page.sessionStorage = {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)}
  const events = []
  const requests = []
  page.location = {reload: () => events.push('reload')}
  page.setInterval = (callback, delay) => { page.poll = callback; page.pollDelay = delay }
  const serviceWorker = update ? {getRegistration: async () => ({update})} : undefined
  const app = createAppUpdates({current, page, document, serviceWorker, fetch: async (url, options) => {
    requests.push({url, cache: options.cache})
    if (served instanceof Error) throw served
    return Response.json(served)
  }})
  return {app, page, document, events, requests, serve: value => { served = value }}
}

test('startup applies a fresh build once when stale navigation returns the same running build', async () => {
  const storage = new Map()
  const first = await boot({storage})
  await first.app.start()
  assert.equal(first.requests.length, 2)
  assert.deepEqual(first.requests[0], {url: '/version.json', cache: 'no-store'})
  assert.deepEqual(first.requests[1], first.requests[0])
  assert.deepEqual(first.events, ['reload'])

  const next = await boot({storage})
  await next.app.start()
  assert.deepEqual(next.app.state.latest, latest)
  assert.equal(next.app.state.status, 'available')
  assert.deepEqual(next.events, [])
})

test('gameplay beginning during worker preparation cancels an automatic reload', async () => {
  let finishWorkerUpdate
  const workerUpdate = new Promise(resolve => { finishWorkerUpdate = resolve })
  const {app, events} = await boot({update: () => workerUpdate})
  const starting = app.start()
  await setImmediate()
  assert.equal(app.state.status, 'applying')
  app.enterGame()
  finishWorkerUpdate()
  await starting
  assert.equal(app.state.status, 'available')
  assert.deepEqual(events, [])
})

test('an in-game update waits for explicit confirmation and a successful save', async () => {
  const {app, events} = await boot({update: () => events.push('worker')})
  app.enterGame()
  await app.start()
  assert.equal(app.state.status, 'available')
  assert.deepEqual(events, [])
  assert.equal(await app.apply(), false)
  assert.equal(await app.apply({beforeReload: () => false}), false)
  assert.deepEqual(events, ['worker'])
  assert.equal(app.state.status, 'available')
  assert.equal(await app.apply({beforeReload: () => { events.push('save'); return true }}), true)
  assert.deepEqual(events, ['worker', 'worker', 'save', 'reload'])
  assert.equal(await app.apply({beforeReload: () => true}), false)
})

test('visibility resume and the one-minute foreground poll detect builds during play', async () => {
  const {app, document, page, requests, serve, events} = await boot({served: current, hidden: true})
  app.enterGame()
  await app.start()
  assert.equal(page.pollDelay, 60_000)
  page.poll()
  assert.equal(requests.length, 1)

  document.hidden = false
  document.dispatchEvent(new Event('visibilitychange'))
  await setImmediate()
  assert.equal(requests.length, 2)

  serve(latest)
  page.poll()
  await setImmediate()
  assert.equal(app.state.status, 'available')
  assert.deepEqual(app.state.latest, latest)
  assert.deepEqual(events, [])
})

test('manual checks share simultaneous requests and retain a known update after a transient failure', async () => {
  const {app, requests, serve, events} = await boot({served: current})
  const states = []
  app.subscribe(state => states.push(state.status))
  app.enterGame()
  await app.start()
  assert.deepEqual(app.state.current, current)
  assert.equal(app.state.status, 'current')

  serve(latest)
  await Promise.all([app.check(), app.check()])
  assert.equal(requests.length, 2)
  const lastChecked = app.state.lastChecked
  assert.equal(typeof lastChecked, 'number')

  serve({version: '0.1.0'})
  await app.check()
  assert.equal(app.state.status, 'error')
  assert.deepEqual(app.state.latest, latest)
  assert.equal(app.state.lastChecked, lastChecked)
  assert.deepEqual(events, [])
  assert.deepEqual(states, ['idle', 'checking', 'current', 'checking', 'available', 'checking', 'error'])
})

test('losing the network after an update was detected blocks save and reload', async () => {
  const {app, serve, events} = await boot()
  app.enterGame()
  await app.start()
  serve(new Error('offline'))
  assert.equal(await app.apply({beforeReload: () => { events.push('save'); return true }}), false)
  assert.equal(app.state.status, 'error')
  assert.deepEqual(app.state.latest, latest)
  assert.deepEqual(events, [])
})

test('startup leaves the running page in place if the deployment rolls back during worker preparation', async () => {
  const {app, serve, events} = await boot({update: () => serve(current)})
  await app.start()
  assert.equal(app.state.status, 'current')
  assert.deepEqual(events, [])
})
