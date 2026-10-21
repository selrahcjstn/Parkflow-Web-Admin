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
const policy = { id: 1, accountAutomaticApproval: false, corAutomaticApproval: false, vehicleAutomaticApproval: false,
  scheduleAutomaticApproval: false, academicYear: '2026-2027', semester: '1st Semester', maxScheduleHoursPerDay: 8, version: 0 }
async function render(superAdmin) {
  const source = readFileSync(new URL('../src/features/settings/components/VerificationSettingsCard.vue', import.meta.url), 'utf8')
    .replace('ref<Policy | null>(null)', `ref<Policy | null>(${JSON.stringify(policy)})`)
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'verification-settings', inlineTemplate: true })
  const code = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'vue') return vue
    if (name === '@/utils/auth') return { isSuperAdminUser: () => superAdmin }
    if (name === '@/api/axios') return { __esModule: true, default: {} }
    if (name === '@/components/ui/UiButton.vue') return { __esModule: true, default: { setup: (_, { slots }) => () => vue.h('button', slots.default?.()) } }
    throw Error(name)
  } })
  const app = vue.createSSRApp(exports.default)
  app.component('RouterLink', { setup: (_, { slots }) => () => vue.h('a', slots.default?.()) })
  return renderToString(app)
}
test('Super Admin sees three approval toggles, manual vehicle guidance and no daily hour limit', async () => {
  const html = await render(true)
  assert.equal((html.match(/type="checkbox"/g) || []).length, 3)
  assert.doesNotMatch(html, /<fieldset[^>]*disabled/)
  assert.doesNotMatch(html, /type="checkbox"[^>]*checked/)
  assert.match(html, /Save approval policies/)
  assert.match(html, /Matching OCR text alone goes to admin review/)
  assert.match(html, /OR\/CR and plate photos are reviewed manually/)
  assert.doesNotMatch(html, /Vehicle automatic approval|Maximum schedule hours per day/)
})
test('regular Admin can inspect policy values but cannot edit or save them', async () => {
  const html = await render(false)
  assert.equal((html.match(/type="checkbox"/g) || []).length, 3)
  assert.match(html, /<fieldset[^>]*disabled/)
  assert.doesNotMatch(html, /Save approval policies/)
  assert.match(html, /Only the Super Admin can change them/)
})
