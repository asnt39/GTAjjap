const VERSION_PATH = '/version.json'
const POLL_INTERVAL = 60_000
const REQUEST_TIMEOUT = 5_000
const WORKER_TIMEOUT = 3_000
const releasePart = /^[a-z0-9.+-]{1,128}$/i

function isRelease(value) {
  return typeof value?.version === 'string' && typeof value.build === 'string' &&
    releasePart.test(value.version) && releasePart.test(value.build)
}

async function refreshWorker(serviceWorker) {
  if (!serviceWorker) return
  let timeout
  try {
    await Promise.race([
      serviceWorker.getRegistration().then(registration => registration?.update()),
      new Promise(resolve => { timeout = setTimeout(resolve, WORKER_TIMEOUT) })
    ])
  } catch {
    // Navigation and the release manifest already use the network with cache bypass.
  } finally {
    clearTimeout(timeout)
  }
}

export function createAppUpdates({
  current,
  page = globalThis.window,
  document = globalThis.document,
  serviceWorker = globalThis.navigator?.serviceWorker,
  fetch = globalThis.fetch
}) {
  let state = {status: 'idle', current, latest: null, lastChecked: null}
  let checking, applying = false, monitoring = false, inGame = false, reloadRequested = false
  const listeners = new Set()
  const reloadKey = `harborline.updateReload.v1.${current.build}`

  function publish(patch) {
    state = {...state, ...patch}
    for (const listener of listeners) listener(state)
  }

  function canAutoApply() {
    if (inGame || document.hidden) return false
    try {
      return page.sessionStorage.getItem(reloadKey) === null
    } catch {
      return false
    }
  }

  async function readLatest() {
    const request = new AbortController()
    const timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT)
    try {
      const response = await fetch(VERSION_PATH, {cache: 'no-store', signal: request.signal})
      const release = response.ok ? await response.json() : null
      return isRelease(release) ? release : null
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  async function reloadUpdate({automatic = false, beforeReload} = {}) {
    if (applying || reloadRequested || !state.latest || state.latest.build === current.build) return false
    if (automatic ? !canAutoApply() : inGame && !beforeReload) return false
    applying = true
    publish({status: 'applying'})

    try {
      await refreshWorker(serviceWorker)
      if (automatic && !canAutoApply()) return false

      const latest = await readLatest()
      if (!latest) {
        publish({status: 'error'})
        return false
      }
      publish({latest, lastChecked: Date.now(), status: latest.build === current.build ? 'current' : 'applying'})
      if (latest.build === current.build || (automatic && !canAutoApply())) return false

      // Record the source build, so stale HTML or a rollback cannot reload it twice in this tab.
      if (beforeReload && (await beforeReload()) !== true) return false
      try {
        page.sessionStorage.setItem(reloadKey, '1')
      } catch {
        if (automatic) return false
      }

      page.location.reload()
      reloadRequested = true
      return true
    } catch {
      publish({status: 'error'})
      return false
    } finally {
      applying = false
      if (!reloadRequested && state.status === 'applying') publish({status: 'available'})
    }
  }

  function check() {
    if (checking) return checking
    if (applying || reloadRequested) return Promise.resolve(state)
    checking = Promise.resolve().then(async () => {
      publish({status: 'checking'})
      const latest = await readLatest()
      if (!latest) {
        publish({status: 'error'})
        return state
      }
      const available = latest.build !== current.build
      publish({status: available ? 'available' : 'current', latest, lastChecked: Date.now()})
      if (available) await reloadUpdate({automatic: true})
      return state
    }).finally(() => { checking = null })
    return checking
  }

  function checkWhenVisible() {
    if (!document.hidden) void check()
  }

  return {
    start() {
      if (!monitoring) {
        monitoring = true
        document.addEventListener('visibilitychange', checkWhenVisible)
        page.addEventListener('pageshow', event => { if (event.persisted) checkWhenVisible() })
        page.setInterval(checkWhenVisible, POLL_INTERVAL)
        return check()
      }
      return checking ?? Promise.resolve(state)
    },
    enterGame() { inGame = true },
    check,
    apply(options) { return checking ? Promise.resolve(false) : reloadUpdate(options) },
    get state() { return state },
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    }
  }
}

const runningRelease = typeof __HARBORLINE_RELEASE__ === 'undefined'
  ? {version: 'dev', build: 'dev'}
  : __HARBORLINE_RELEASE__

export const appUpdates = createAppUpdates({current: runningRelease})
