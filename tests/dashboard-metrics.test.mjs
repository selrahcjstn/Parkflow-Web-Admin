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

function component(path, modules = {}, inlineTemplate = false) {
  const { descriptor } = parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
  const script = compileScript(descriptor, { id: path, inlineTemplate })
  const code = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, Date, Intl, Number, console: { error() {} },
    require(name) {
      if (name === 'vue') return { ...vue, onMounted() {} }
      if (name in modules) return { __esModule: true, ...modules[name] }
      if (name.endsWith('.vue')) return { __esModule: true, default: {} }
      throw Error('Unexpected dependency: ' + name)
    },
  })
  return exports.default
}

const zeroMetrics = () => ({
  totalUsers: 0, activeParking: 0, maxCapacity: 500, todayRevenue: 0, violations: 0,
  trends: { registeredClientsPercent: 0, revenuePercent: 0, pendingChargesPercent: 0, comparisonDate: '2026-10-11T00:00:00' },
})

function dashboard(initial = zeroMetrics(), get = async () => { throw Error('Offline') }) {
  const cache = { cachedStatsData: vue.ref(initial), cachedActivityData: vue.ref([]) }
  const Page = component('src/features/dashboard/pages/DashboardPage.vue', {
    '@/stores/appCache': cache,
    '@/api/axios': { default: { get } },
  })
  return { state: Page.setup({}, { expose() {} }), cache }
}

test('zero metrics use one-decimal percentages, two-decimal money, and no fabricated arrows', () => {
  const { state } = dashboard()
  assert.deepEqual(Array.from(state.stats.value, stat => stat.trend), ['0.0%', '0.0% full', '0.0%', '0.0%'])
  assert.equal(state.stats.value[0].value, '0')
  assert.equal(state.stats.value[2].value, '₱0.00')
  assert.ok(state.stats.value.every(stat => stat.trendUp === undefined))
})

test('occupancy is calculated without whole-percentage rounding or a directional arrow', () => {
  const { state } = dashboard({ ...zeroMetrics(), activeParking: 11 })
  assert.equal(state.stats.value[1].trend, '2.2% full')
  assert.ok(Math.abs(state.stats.value[1].progressPercent - 2.2) < 0.000001)
  assert.equal(state.stats.value[1].subtitle, '489 slots available')
  state.statsData.value.activeParking = 25
  assert.equal(state.stats.value[1].trend, '5.0% full')
})

test('trend badges follow actual server comparisons and reverse the good direction for unpaid charges', () => {
  const metrics = zeroMetrics()
  Object.assign(metrics.trends, { registeredClientsPercent: 37.2, revenuePercent: -25, pendingChargesPercent: -50 })
  const { state } = dashboard(metrics)
  assert.equal(state.stats.value[0].trend, '+37.2%')
  assert.equal(state.stats.value[0].trendUp, true)
  assert.equal(state.stats.value[2].trend, '-25.0%')
  assert.equal(state.stats.value[2].trendTone, 'negative')
  assert.equal(state.stats.value[3].trend, '-50.0%')
  assert.equal(state.stats.value[3].trendUp, false)
  assert.equal(state.stats.value[3].trendTone, 'positive')
  assert.match(state.stats.value[0].trendLabel, /2026-10-11/)
})

test('undefined or missing historical baselines are not shown as fake zero growth', () => {
  const metrics = zeroMetrics()
  metrics.trends.registeredClientsPercent = null
  metrics.trends.revenuePercent = null
  metrics.trends.pendingChargesPercent = null
  const { state } = dashboard(metrics)
  for (const index of [0, 2, 3]) assert.equal(state.stats.value[index].trend, 'No comparison')
  delete state.statsData.value.trends
  for (const index of [0, 2, 3]) assert.equal(state.stats.value[index].trend, 'No comparison')
})

test('unset capacity and over-capacity do not show negative free slots or invalid percentages', () => {
  const { state } = dashboard({ ...zeroMetrics(), maxCapacity: 0 })
  assert.equal(state.stats.value[1].trend, 'Capacity not set')
  assert.equal(state.stats.value[1].progressPercent, undefined)
  Object.assign(state.statsData.value, { activeParking: 510, maxCapacity: 500 })
  assert.equal(state.stats.value[1].trend, '102.0% full')
  assert.equal(state.stats.value[1].subtitle, '0 slots available')
})

test('failed metrics request without cache shows an error, not fabricated zero records', async () => {
  const { state } = dashboard(null)
  await state.fetchDashboardStats()
  assert.equal(state.stats.value.length, 0)
  assert.match(state.statsError.value, /Could not load/)
  assert.equal(state.isFetching.value, false)
})

test('loaded data and daily comparisons are cached together', async () => {
  const { state, cache } = dashboard(null, async () => ({ data: { isSuccess: true, data: {
    totalUsers: 90, activeParking: 10, maxCapacity: 300, todayRevenue: 1234.5, violationsCount: 2,
    trends: { registeredClientsPercent: 12.5, revenuePercent: 8.1, pendingChargesPercent: -3.3, comparisonDate: '2026-10-11' },
  } } }))
  await state.fetchDashboardStats()
  assert.equal(state.stats.value[1].trend, '3.3% full')
  assert.equal(state.stats.value[2].value, '₱1,234.50')
  assert.equal(cache.cachedStatsData.value.trends.registeredClientsPercent, 12.5)
})

test('malformed API metrics retain last valid records and warn instead of silently inventing counts', async () => {
  const { state } = dashboard({ ...zeroMetrics(), totalUsers: 42 }, async () => ({
    data: { isSuccess: true, data: { totalUsers: null } },
  }))
  await state.fetchDashboardStats()
  assert.equal(state.stats.value[0].value, '42')
  assert.match(state.statsError.value, /Last loaded values/)
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
