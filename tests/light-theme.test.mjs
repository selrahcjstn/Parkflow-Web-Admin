import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('dark: utilities are bound to a .dark ancestor, never to the OS color scheme', () => {
  const css = read('src/assets/styles/main.css')
  assert.match(css, /@custom-variant dark \(&:where\(\.dark, \.dark \*\)\)/)
  assert.match(css, /color-scheme:\s*light/)
  assert.doesNotMatch(css, /@media\s*\(\s*prefers-color-scheme/)
})

test('the document declares light only for native controls, scrollbars and form popups', () => {
  const html = read('index.html')
  assert.match(html, /<meta name="color-scheme" content="light">/)
  assert.match(html, /<html[^>]*style="color-scheme: light"/)
})

test('no theme preference or dark toggle is applied to the document', () => {
  const main = read('src/main.ts')
  assert.match(main, /enforceLightTheme\(\)/)
  assert.doesNotMatch(main, /matchMedia|prefers-color-scheme|localStorage/)
})

test('enforceLightTheme removes a dark class added later and pins the color scheme', () => {
  const code = ts.transpileModule(read('src/theme/lightTheme.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const classes = new Set(['dark'])
  const root = {
    classList: { contains: (name) => classes.has(name), remove: (name) => classes.delete(name) },
    dataset: {},
    style: { colorScheme: 'dark' },
  }
  let notify
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    document: { documentElement: root },
    MutationObserver: class { constructor(callback) { notify = callback } observe() {} },
  })

  exports.enforceLightTheme()
  assert.equal(classes.has('dark'), false)
  assert.equal(root.style.colorScheme, 'light')
  assert.equal(root.dataset.theme, 'light')

  // Something (an extension, a library) tries to switch to dark after startup.
  classes.add('dark')
  root.style.colorScheme = 'dark'
  notify()
  assert.equal(classes.has('dark'), false)
  assert.equal(root.style.colorScheme, 'light')
})
