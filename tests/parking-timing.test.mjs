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

const SettingsCard = component('src/features/settings/components/ParkingTimingCard.vue', {
  '@/components/ui/UiCard.vue': { default: component('src/components/ui/UiCard.vue') },
  '@/components/ui/UiInput.vue': { default: component('src/components/ui/UiInput.vue') },
})

for (const enabled of [true, false]) {
test(`settings retains ${enabled ? 'enabled' : 'disabled'} exit grace and staff times without early-entry controls`, async () => {
  const html = await renderToString(vue.createSSRApp(SettingsCard, { settings: {
    gracePeriodMinutes: 15, isGracePeriodEnabled: enabled,
    personnelFreeParkingStart: '05:00', personnelFreeParkingEnd: '21:00',
  } }))
  assert.match(html, /Staff window starts/)
  assert.match(html, /Staff window ends/)
  assert.equal([...html.matchAll(/type="time"/g)].length, 2)
  assert.match(html, /value="05:00"/)
  assert.match(html, /value="21:00"/)
  assert.match(html, /including Sunday/)
  assert.match(html, /Exit Grace Period/)
  assert.match(html, /value="15"/)
  const numberInput = html.match(/<input[^>]*type="number"[^>]*>/)?.[0] ?? ""
  assert.ok(numberInput)
  assert.equal(/\sdisabled(?=[\s=>])/.test(numberInput), !enabled)
  assert.doesNotMatch(html, /Early Entry|earlyParking|early entry allowance/)
  assert.match(html, /Fees are configured separately/)
})
}
