import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { renderToString } = require('@vue/server-renderer')
const ts = require('typescript')

function component(path, modules = {}, inlineTemplate = false, globals = {}) {
  const { descriptor } = parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
  const script = compileScript(descriptor, { id: path, inlineTemplate })
  const code = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, Date, Intl, Number, ...globals, console: { error() {} },
    require(name) {
      if (name === 'vue') return { ...vue, onMounted() {}, onUnmounted() {}, onErrorCaptured() {} }
      if (name in modules) return { __esModule: true, ...modules[name] }
      if (name.endsWith('.vue')) return { __esModule: true, default: {} }
      throw Error('Unexpected dependency: ' + name)
    },
  })
  return exports.default
}

// Loads a plain TypeScript module (composables, API layer) with explicit mocks, like component() does for SFCs.
function tsModule(path, modules = {}) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, Date, Number, console: { error() {} },
    require(name) {
      if (name === 'vue') return { ...vue, onMounted() {}, onUnmounted() {}, onErrorCaptured() {} }
      if (name in modules) return { __esModule: true, ...modules[name] }
      throw Error('Unexpected dependency: ' + name)
    },
  })
  return exports
}

const resource = (data, error = '') => ({
  data: vue.ref(data), loading: vue.ref(false), refreshing: vue.ref(false), error: vue.ref(error), async load() {},
})

const summaryOf = (over = {}) => ({
  totalUsers: 0, activeParking: 0, maxCapacity: 500, ...over,
  trends: { registeredClientsPercent: 0, comparisonDate: '2026-10-11T00:00:00', ...over.trends },
})

function dashboard({ summary = summaryOf(), overview = null } = {}) {
  const Page = component('src/features/dashboard/pages/DashboardPage.vue', {
    '../composables/useDashboardAnalytics': { useDashboardAnalytics: () => ({
      range: vue.ref('7d'), summary: resource(summary), overview: resource(overview), activity: resource(null), refreshAll() {},
    }) },
  })
  return Page.setup({}, { expose() {} })
}

function analytics({ cached = null, api } = {}) {
  const cache = { cachedStatsData: vue.ref(cached) }
  const module = tsModule('src/features/dashboard/composables/useDashboardAnalytics.ts', {
    '@/stores/notification.store': { useAdminNotificationStore: () => ({ onApprovalUpdate: () => () => {} }) },
    '@/stores/appCache': cache,
    '../api/dashboard.api': api,
  })
  return { ...module.useDashboardAnalytics(), cache }
}

const offlineApi = { dashboardApi: {
  summary: async () => { throw Error('Offline') }, overview: async () => { throw Error('Offline') }, activity: async () => { throw Error('Offline') },
} }

test('zero operational metrics show zeros and a 0.0% occupancy, with no financial cards', () => {
  const state = dashboard()
  assert.equal(state.occupancy.value, 0)
  assert.equal(state.number(0), '0')
  assert.equal(state.available.value, 500)
  const source = readFileSync(new URL('../src/features/dashboard/pages/DashboardPage.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /revenue|payment|penalt|collection/i)
})

test('occupancy keeps decimal precision and is not capped at 100%', () => {
  const state = dashboard({ summary: summaryOf({ activeParking: 11 }) })
  assert.ok(Math.abs(state.occupancy.value - 2.2) < 0.000001)
  assert.equal(state.occupancy.value.toFixed(1), '2.2')
})

test('client growth badge follows the server comparison and only shows movement when real', () => {
  const growth = dashboard({ summary: summaryOf({ trends: { registeredClientsPercent: 37.2 } }) }).clientsDelta.value
  assert.deepEqual({ ...growth }, { delta: '+37.2%', deltaDirection: 'up', deltaTone: 'positive' })
  const drop = dashboard({ summary: summaryOf({ trends: { registeredClientsPercent: -4.5 } }) }).clientsDelta.value
  assert.deepEqual({ ...drop }, { delta: '-4.5%', deltaDirection: 'down', deltaTone: 'negative' })
  const flat = dashboard({ summary: summaryOf({ trends: { registeredClientsPercent: 0 } }) }).clientsDelta.value
  assert.deepEqual({ ...flat }, { delta: '0.0%', deltaDirection: 'flat', deltaTone: 'neutral' })
})

test('undefined or missing historical baselines are not shown as fake zero growth', () => {
  assert.deepEqual({ ...dashboard({ summary: summaryOf({ trends: { registeredClientsPercent: null } }) }).clientsDelta.value }, {})
  const summary = summaryOf()
  delete summary.trends
  assert.deepEqual({ ...dashboard({ summary }).clientsDelta.value }, {})
})

test('unset capacity and over-capacity do not show negative free slots or invalid percentages', () => {
  const unset = dashboard({ summary: summaryOf({ maxCapacity: 0 }) })
  assert.equal(unset.occupancy.value, undefined)
  assert.equal(unset.available.value, undefined)
  const over = dashboard({ summary: summaryOf({ activeParking: 510, maxCapacity: 500 }) })
  assert.equal(over.occupancy.value.toFixed(1), '102.0')
  assert.ok(Number.isFinite(over.occupancy.value))
  assert.equal(over.available.value, 0)
})

test('missing data shows a dash, never a fabricated zero', () => {
  const state = dashboard()
  assert.equal(state.number(undefined), '—')
  assert.equal(state.number(null), '—')
  assert.equal(state.number(0), '0')
  assert.equal(state.totalPendingDecisions.value, undefined)
})

test('failed metrics request without cache shows an error, not fabricated zero records', async () => {
  const { summary } = analytics({ api: offlineApi })
  await summary.load()
  assert.equal(summary.data.value, null)
  assert.match(summary.error.value, /Offline/)
  assert.equal(summary.loading.value, false)
  assert.equal(summary.refreshing.value, false)
})

test('loaded data and daily comparisons are cached together', async () => {
  const data = { totalUsers: 90, activeParking: 10, maxCapacity: 300, trends: { registeredClientsPercent: 12.5, comparisonDate: '2026-10-11' } }
  const { summary, cache } = analytics({ api: { dashboardApi: { ...offlineApi.dashboardApi, summary: async () => data } } })
  await summary.load()
  assert.equal(summary.data.value.totalUsers, 90)
  assert.equal(cache.cachedStatsData.value.trends.registeredClientsPercent, 12.5)
})

test('malformed API metrics retain last valid records and report an error instead of inventing counts', async () => {
  const api = tsModule('src/features/dashboard/api/dashboard.api.ts', {
    '@/api/axios': { default: { get: async () => ({ data: { isSuccess: true, data: { totalUsers: null } } }) } },
  })
  const { summary } = analytics({ cached: summaryOf({ totalUsers: 42 }), api })
  await summary.load()
  assert.equal(summary.data.value.totalUsers, 42)
  assert.match(summary.error.value, /Invalid dashboard metrics/)
})

test('overview and activity requests surface the server message instead of empty data', async () => {
  const api = tsModule('src/features/dashboard/api/dashboard.api.ts', {
    '@/api/axios': { default: { get: async () => ({ data: { isSuccess: false, message: 'Forbidden for this role.' } }) } },
  })
  await assert.rejects(() => api.dashboardApi.overview(), /Forbidden for this role/)
  await assert.rejects(() => api.dashboardApi.activity('7d'), /Forbidden for this role/)
})

test('recent activity table shows a dash for an invalid date instead of crashing the render', async () => {
  const Table = component('src/features/dashboard/components/analytics/RecentParkingTable.vue', {}, true)
  const row = (entryTime, exitTime) => ({ source: 'Registered', identifier: 'ABC 1234', owner: 'Juan', vehicleType: 'Car', entryTime, exitTime, status: 'Inside' })
  const html = await renderToString(vue.createSSRApp(Table, { rows: [row('not-a-date', null), row('2026-11-10T08:30:00Z', 'also-bad')] }))
  assert.match(html, /ABC 1234/)
  // Row 1: invalid entry and empty exit; row 2: invalid exit.
  assert.equal([...html.matchAll(/>—</g)].length, 3)
  assert.match(html, /Nov 10/)
})

test('a widget that fails to render is reported on the dashboard instead of blanking it', () => {
  const source = readFileSync(new URL('../src/features/dashboard/pages/DashboardPage.vue', import.meta.url), 'utf8')
  assert.match(source, /onErrorCaptured/)
  assert.match(source, /Part of the dashboard could not be displayed/)
})

const Card = component('src/features/dashboard/components/StatsCard.vue', {
  '@/components/ui/UiCard.vue': { default: { setup: (_, { slots }) => () => vue.h('div', slots.default?.()) } },
}, true)

test('card renders matching decimal percentages and only shows arrows for real movement', async () => {
  const props = { title: 'Slot Occupancy', value: '11 / 500', subtitle: '489 slots available',
    trend: '2.2% full', progressPercent: 2.2, accentColor: 'var(--color-success)', badgeBg: 'var(--color-success-bg)' }
  const html = await renderToString(vue.createSSRApp(Card, props))
  assert.equal([...html.matchAll(/>\s*2\.2%(?: full)?\s*</g)].length, 2)
  assert.doesNotMatch(html, /↑|↓/)
  const decrease = await renderToString(vue.createSSRApp(Card, { ...props, trend: '-50.0%', trendUp: false, trendTone: 'positive' }))
  assert.match(decrease, /↓/)
  assert.match(decrease, /bg-success-bg text-success/)
})

test('reports fetch and export operational history without financial records', async () => {
  const calls = [], downloads = []
  let exported
  const log = { sessionId: 'session-1', plateNumber: 'ABC123', firstName: 'Driver', lastName: 'One',
    entryTime: new Date().toISOString(), exitTime: new Date().toISOString(), parkingDuration: 1,
    vehicleType: 'Car', status: 'Completed', entryMethod: 'QrCode' }
  const Page = component('src/features/reports/pages/ReportsPage.vue', {
    '@/api/axios': { default: { get: async route => {
      calls.push(route)
      const data = route.includes('history') ? { items: [log] } : route.includes('settings') ? { totalCapacity: 500 } : []
      return { data: { isSuccess: true, data } }
    } } },
  }, false, {
    Blob, setTimeout() {},
    URL: { createObjectURL(blob) { exported = blob; return 'blob:test' } },
    document: { createElement: () => ({ setAttribute: (...args) => downloads.push(args), click() {} }),
      body: { appendChild() {}, removeChild() {} } },
  })
  const state = Page.setup({}, { expose() {} })
  await state.fetchReportsData()
  assert.ok(calls.some(route => route.includes('parking-history')))
  assert.ok(calls.every(route => !/violation|payment/i.test(route)))
  assert.deepEqual(Array.from(state.reportTabs.value, tab => tab.key), ['overview', 'activity', 'vehicles'])
  state.triggerExport('csv')
  const csv = await exported.text()
  assert.match(csv, /Session ID,Plate Number/)
  assert.match(csv, /session-1/)
  assert.doesNotMatch(csv, /payment|penalty|charge|fee|settlement|violation/i)
  assert.ok(downloads.some(([name]) => name === 'download'))
})
