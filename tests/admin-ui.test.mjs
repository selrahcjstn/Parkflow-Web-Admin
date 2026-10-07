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

function component(path, modules = {}, transform = (source) => source) {
  const source = transform(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: path, inlineTemplate: true })
  const code = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    Date,
    console,
    require: (name) => {
      if (name === 'vue') return vue
      if (name in modules) return { __esModule: true, ...modules[name] }
      throw new Error('Unexpected dependency: ' + name)
    },
  })
  return exports.default
}

const Pagination = component('src/components/ui/TablePagination.vue')

test('Visitors keeps search left and pushes campus status and refresh right', () => {
  const source = readFileSync(
    new URL('../src/features/visitors/pages/VisitorsPage.vue', import.meta.url),
    'utf8',
  )
  assert.match(source, /class="min-w-0 flex-1 sm:max-w-md"/)
  assert.match(source, /class="min-w-0 sm:ml-auto sm:w-52 sm:shrink-0"/)
  assert.match(source, /class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"/)
})
const Button = component('src/components/ui/UiButton.vue')
const SettingsCard = component('src/features/settings/components/OverstayFeeCard.vue', {
  '@/components/ui/UiButton.vue': { default: Button },
  '@/components/ui/UiCard.vue': { default: component('src/components/ui/UiCard.vue') },
  '@/components/ui/UiInput.vue': { default: component('src/components/ui/UiInput.vue') },
  '@/components/ui/UiSelect.vue': { default: component('src/components/ui/UiSelect.vue') },
})

test('settings uses labeled time fields and explains daily faculty/staff and overnight rules', async () => {
  const html = await renderToString(vue.createSSRApp(SettingsCard, { settings: {
    violationRatePerHour: 100, feeCalculationMode: 'per_hour', baseFee: 50,
    gracePeriodMinutes: 15, isGracePeriodEnabled: true, earlyParkingMinutes: 15,
    isEarlyParkingAllowed: true, personnelFreeParkingStart: '05:00', personnelFreeParkingEnd: '21:00',
  } }))
  assert.match(html, /Free parking starts/)
  assert.match(html, /Free parking ends/)
  assert.equal([...html.matchAll(/type="time"/g)].length, 2)
  assert.match(html, /value="05:00"/)
  assert.match(html, /value="21:00"/)
  assert.match(html, /including Sunday/)
  assert.match(html, /unclosed session keeps accruing charges/)
})
const Confirmation = component('src/components/ui/ConfirmModal.vue', {
  './UiButton.vue': { default: Button },
})

test('confirmation actions stay in bounded responsive columns and disable during submission', async () => {
  const context = {}
  await renderToString(
    vue.createSSRApp(Confirmation, {
      isOpen: true,
      title: 'Sign out of ParkFlow?',
      message: 'Return to login.',
      confirmText: 'Yes, Sign Out',
      isSubmitting: true,
    }),
    context,
  )
  const html = context.teleports.body
  assert.match(html, /grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2/)
  assert.match(html, /max-w-md/)
  assert.match(html, /role="dialog" aria-modal="true"/)
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)]
  assert.equal(buttons.length, 3)
  for (const button of buttons) assert.match(button[0], /disabled/)
  for (const button of buttons.slice(1)) assert.match(button[0], /min-w-0/)
})

test('shared pagination renders the page range, selected theme and unique label targets', async () => {
  const html = await renderToString(
    vue.createSSRApp({
      render: () =>
        vue.h(
          'div',
          [1, 2].map(() =>
            vue.h(Pagination, {
              totalItems: 27,
              currentPage: 2,
              itemsPerPage: 10,
            }),
          ),
        ),
    }),
  )
  assert.match(html, /Showing 11 to 20 of 27 entries/)
  assert.match(html, /aria-current="page"[^>]*bg-primary text-text-inverse/)
  const ids = [...html.matchAll(/<select id="([^"]+)"/g)].map((match) => match[1])
  assert.equal(ids.length, 2)
  assert.notEqual(ids[0], ids[1])
  for (const id of ids) assert.ok(html.includes('for="' + id + '"'))
})

test('pagination disables controls while loading and does not render an empty pager', async () => {
  const html = await renderToString(
    vue.createSSRApp(Pagination, {
      totalItems: 27,
      currentPage: 2,
      itemsPerPage: 10,
      disabled: true,
    }),
  )
  for (const button of html.matchAll(/<button\b[^>]*>/g)) {
    assert.match(button[0], /disabled/)
    assert.match(button[0], /type="button"/)
  }
  const empty = await renderToString(vue.createSSRApp(Pagination, { totalItems: 0 }))
  assert.doesNotMatch(empty, /<button|<select/)
})

test('selected calendar date has inverse text without a conflicting normal-day color', async () => {
  const Slot = {
    setup:
      (_, { slots }) =>
      () =>
        vue.h('div', slots.default?.()),
  }
  const Calendar = component(
    'src/features/dashboard/components/DashboardCalendar.vue',
    {
      'vue-router': { useRouter: () => ({ push() {} }) },
      '@/api/axios': {
        default: {
          get() {
            throw new Error('SSR must not fetch')
          },
        },
      },
      '@/components/ui/UiCard.vue': { default: Slot },
      '@/components/ui/UiAvatar.vue': { default: Slot },
      '@/components/ui/SkeletonLoader.vue': { default: Slot },
      '@/stores/notification.store': { useAdminNotificationStore() {} },
      '@/utils/formatTime': { formatTimeRange12: () => '' },
    },
    (source) => source.replace('const isLoading = ref(true)', 'const isLoading = ref(false)'),
  )
  const html = await renderToString(vue.createSSRApp(Calendar))
  const selected = html.match(/<button\b[^>]*aria-pressed="true"[^>]*>/)?.[0]
  assert.ok(selected, 'Exactly the initially selected date should be visible')
  assert.match(selected, /bg-primary text-text-inverse/)
  assert.doesNotMatch(selected, /text-slate|text-subtle|text-text(?: |")/)
  assert.equal([...html.matchAll(/aria-pressed="true"/g)].length, 1)
})
