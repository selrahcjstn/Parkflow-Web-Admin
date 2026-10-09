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

test('Official Parking Pass keeps printing and QR viewing without copy, share or download actions', async () => {
  for (const zoomed of [false, true]) {
    const Pass = component('src/features/reservations/pages/ReservationPassPage.vue', {
      'vue-router': { useRoute: () => ({ params: { id: 'reservation-id' } }), useRouter: () => ({ push() {} }) },
      '@/api/axios': { default: { get() { throw new Error('Rendering must not fetch') } } },
      '@/components/ui/SkeletonLoader.vue': { default: component('src/components/ui/SkeletonLoader.vue') },
      '@/stores/appCache': { cachedReservations: vue.ref([]) },
    }, source => source
      .replace('ref<ParkingReservationItem | null>(null)', 'ref<ParkingReservationItem | null>({ referenceNumber: "RES-001", status: 1 })')
      .replace('const isLoading = ref(true)', 'const isLoading = ref(false)')
      .replace('const isQrZoomed = ref(false)', `const isQrZoomed = ref(${zoomed})`))
    const context = {}
    const html = await renderToString(vue.createSSRApp(Pass), context)
    const allHtml = html + (context.teleports?.body ?? '')
    assert.doesNotMatch(allHtml, /Copy Ref|Share Link|Download QR|Download SVG/)
    assert.match(html, /Print Pass/)
    assert.match(html, /<img[^>]+create-qr-code/)
    assert.match(html, /RES-001/)
    if (zoomed) {
      assert.match(context.teleports.body, /Gate Optical Scan Code/)
      assert.match(context.teleports.body, />\s*Close\s*</)
    }
  }
})

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
test('role filter counts and administrator options update after accounts load', () => {
  const Filters = component('src/features/users/components/UserFilters.vue', {
    '@/components/ui/UiButton.vue': { default: Button },
    '@/components/ui/UiInput.vue': { default: component('src/components/ui/UiInput.vue') },
    '@/components/ui/UiSelect.vue': { default: component('src/components/ui/UiSelect.vue') },
  })
  const props = vue.reactive({
    searchQuery: '', selectedRole: 'all', selectedStatus: 'all', selectedVehicleFilter: 'all',
    totalCount: 0, studentCount: 0, facultyCount: 0, staffCount: 0, guardCount: 0, adminCount: 0,
    isSuperAdmin: false,
  })
  // Keep the same component instance, just as when the API fills initially empty counts.
  const render = Filters.setup(props, { expose() {}, emit() {} })
  function roleLabels() {
    let options
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit)
      if (node?.props?.label === 'Role') options = node.props.options
      if (node?.children) visit(node.children)
    }
    visit(render({}, []))
    return Array.from(options, item => item.label)
  }
  assert.deepEqual(roleLabels(), ['All Account Types (0)', 'Student (0)', 'Faculty (0)', 'University Staff (0)'])
  Object.assign(props, { totalCount: 92, studentCount: 64, facultyCount: 22, staffCount: 6 })
  assert.deepEqual(roleLabels(), ['All Account Types (92)', 'Student (64)', 'Faculty (22)', 'University Staff (6)'])
  Object.assign(props, { isSuperAdmin: true, guardCount: 3, adminCount: 2 })
  assert.deepEqual(roleLabels().slice(-2), ['Security Guards (3)', 'Administrators (2)'])
  props.studentCount = 65
  assert.equal(roleLabels()[1], 'Student (65)')
})
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

test('registration approval dialogs use the shared success check icon and approval labels', async () => {
  for (const page of ['NewUserApprovalsPage', 'ScheduleApprovalsPage', 'VehicleApprovalsPage']) {
    const source = readFileSync(new URL(`../src/features/registrations/pages/${page}.vue`, import.meta.url), 'utf8')
    const approval = source.match(/<ConfirmModal\s+:is-open="isConfirmApproveOpen"[\s\S]*?\/>/)?.[0]
    assert.ok(approval, `${page} must have an approval confirmation`)
    assert.match(approval, /\bvariant="success"/, `${page} must use the supported success variant`)
    const confirmText = approval.match(/\bconfirm-text="([^"]+)"/)?.[1]
    assert.match(confirmText ?? '', /Approve/)
    const context = {}
    await renderToString(vue.createSSRApp(Confirmation, {
      isOpen: true,
      title: 'Approve registration',
      message: 'Confirm approval.',
      variant: 'success',
      confirmText,
    }), context)
    assert.match(context.teleports.body, /points="20 6 9 17 4 12"/)
    assert.doesNotMatch(context.teleports.body, /points="3 6 5 6 21 6"/)
    assert.ok(context.teleports.body.includes(confirmText))
  }
})

const CampusCapacity = component('src/features/settings/components/CampusCapacityCard.vue', {
  '@/components/ui/UiButton.vue': { default: Button },
  '@/components/ui/UiCard.vue': { default: component('src/components/ui/UiCard.vue') },
  '@/components/ui/UiInput.vue': { default: component('src/components/ui/UiInput.vue') },
  '@/components/ui/UiSelect.vue': { default: component('src/components/ui/UiSelect.vue') },
})

test('Super Admin allocation is a configurable percentage of total capacity, not extra spaces', async () => {
  const html = await renderToString(vue.createSSRApp(CampusCapacity, { settings: {
    totalCapacity: 300, reservationAllocationPercent: 30, maxVehiclesPerUser: 5,
    academicYear: '2026-2027', currentSemester: '1st Semester',
  } }))
  assert.match(html, /Reservation allocation \(%\)/)
  assert.match(html, /90 reservation spaces out of 300 total spaces/)
  assert.match(html, /min="0" max="100" step="1"/)
  assert.match(html, /not additional spaces/)
  const modified = await renderToString(vue.createSSRApp(CampusCapacity, { settings: {
    totalCapacity: 300, reservationAllocationPercent: 50, maxVehiclesPerUser: 5,
    academicYear: '2026-2027', currentSemester: '1st Semester',
  } }))
  assert.match(modified, /150 reservation spaces out of 300 total spaces/)
})

test('admin booking checks selected-time availability rather than loading all reservations', () => {
  const source = readFileSync(new URL('../src/features/reservations/pages/CreateReservationPage.vue', import.meta.url), 'utf8')
  assert.match(source, /parking-reservations\/availability/)
  assert.match(source, /parking-reservations\/my/)
  assert.doesNotMatch(source, /parking-reservations\/admin\/all/)
  assert.match(source, /:disabled="capacityUnavailable"/)
  assert.match(source, /availability\.bookedSlots/)
  assert.match(source, /offReservations\?\.\(\)/)
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
