import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(path, modules = {}) {
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: (name) => modules[name], Date, Map, Set, Promise })
  return exports
}
const { createRequestCache } = load('src/api/requestCache.ts')

test('parallel GETs share work and successful empty results are cached', async () => {
  const cache = createRequestCache()
  let calls = 0
  const fetch = async () => {
    calls++
    return []
  }
  await Promise.all([cache.read('users', fetch), cache.read('users', fetch)])
  await cache.read('users', fetch)
  assert.equal(calls, 1)
})
test('failed requests are retryable', async () => {
  const cache = createRequestCache()
  await assert.rejects(
    cache.read('users', async () => {
      throw Error('offline')
    }),
  )
  assert.equal(await cache.read('users', async () => 'ok'), 'ok')
})
test('invalidating during a GET prevents stale cache replacement', async () => {
  const cache = createRequestCache()
  let release
  const old = cache.read(
    'users',
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  cache.clear()
  await cache.read('users', async () => 'fresh')
  release('old')
  await old
  assert.equal(await cache.read('users', async () => 'wrong'), 'fresh')
})
test('cache entries expire', async () => {
  const cache = createRequestCache(-1)
  let calls = 0
  const fetch = async () => ++calls
  await cache.read('users', fetch)
  assert.equal(await cache.read('users', fetch), 2)
})
test('page snapshots are reset when the account changes', () => {
  const vue = {
    ref: (value) => ({ value }),
    customRef: (factory) => {
      const handlers = factory(
        () => {},
        () => {},
      )
      return Object.defineProperty({}, 'value', { get: handlers.get, set: handlers.set })
    },
  }
  const store = load('src/stores/appCache.ts', { vue })
  store.syncCacheOwner('first')
  store.cachedUsers.value = [{ id: 'private' }]
  store.syncCacheOwner('second')
  assert.equal(store.cachedUsers.value, null)
})
test('restored pages do not expose grid mode or approval/operation metrics', () => {
  for (const name of ['NewUserApprovalsPage', 'ScheduleApprovalsPage', 'VehicleApprovalsPage']) {
    const page = readFileSync(
      new URL('../src/features/registrations/pages/' + name + '.vue', import.meta.url),
      'utf8',
    )
    assert.doesNotMatch(page, /ApprovalStatsBar|ApprovalCard|viewMode/)
  }
  for (const [feature, page, stats] of [
    ['parking', 'ParkingPage', 'ParkingStats'],
    ['vehicles', 'VehiclesPage', 'VehicleStats'],
    ['reservations', 'ReservationsPage', 'ReservationStats'],
    ['violations', 'ViolationsPage', 'ViolationStats'],
  ]) {
    assert.ok(
      !readFileSync(
        new URL('../src/features/' + feature + '/pages/' + page + '.vue', import.meta.url),
        'utf8',
      ).includes(stats),
    )
  }
})
test('restored controls and layout use Tailwind, not scoped or inline CSS', () => {
  for (const path of [
    'components/ui/UiButton.vue',
    'components/ui/UiInput.vue',
    'components/ui/UiSelect.vue',
    'layouts/AdminLayout.vue',
    'features/auth/pages/LoginPage.vue',
    'features/auth/components/LoginForm.vue',
  ]) {
    assert.doesNotMatch(
      readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'),
      /<style|\bstyle=/,
    )
  }
})
test('dashboard calendar requests a bounded page and does not invent reservations', () => {
  const source = readFileSync(
    new URL('../src/features/dashboard/components/DashboardCalendar.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /admin\/calendar/)
  assert.match(source, /page: calendarPage\.value/)
  assert.doesNotMatch(source, /admin\/all|populateMockReservations|cachedReservations/)
})
test('compiled theme generates real token utilities', (t) => {
  const { readdirSync, existsSync } = require('node:fs')
  const assets = new URL('../dist/assets/', import.meta.url)
  if (!existsSync(assets)) return t.skip('Run npm run build before checking generated theme CSS')
  const css = readdirSync(assets)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(new URL(name, assets), 'utf8'))
    .join('\n')
  assert.doesNotMatch(css, /@theme\s/)
  assert.match(css, /\.bg-primary\{/)
  assert.match(css, /--color-primary:/)
})
test('an old Authorization header cannot read or populate the new account cache', async () => {
  let calls = 0
  const instance = {
    defaults: { adapter: 'test' },
    interceptors: { request: { use() {} }, response: { use() {} } },
  }
  const axios = {
    create: () => instance,
    getAdapter: () => async () => {
      calls++
      return { data: 'old private data' }
    },
    CanceledError: class extends Error {},
  }
  const source = readFileSync(new URL('../src/api/axios.ts', import.meta.url), 'utf8').replace(
    'import.meta.env.VITE_API_URL',
    'undefined',
  )
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, {
    exports: {},
    structuredClone,
    URL,
    localStorage: { getItem: () => 'new' },
    require: (name) =>
      name === 'axios'
        ? { __esModule: true, default: axios }
        : name === './requestCache'
          ? { createRequestCache }
          : { resetAppCache() {}, syncCacheOwner() {} },
  })
  await assert.rejects(
    instance.defaults.adapter({
      method: 'get',
      url: '/users',
      headers: { Authorization: 'Bearer old' },
    }),
    /Account changed/,
  )
  assert.equal(calls, 0)
})
