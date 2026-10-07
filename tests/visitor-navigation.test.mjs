import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const vueRouter = require('vue-router')

function load(path) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'vue-router')
        return { ...vueRouter, createWebHistory: vueRouter.createMemoryHistory }
      if (name === '@/stores/appCache') return { syncCacheOwner() {} }
      if (name === '@/utils/auth') return { isSuperAdminUser: () => false }
      if (name.startsWith('@/features/') && name.endsWith('/routes')) {
        const base = 'src/' + name.slice(2)
        return load(
          existsSync(new URL('../' + base + '.ts', import.meta.url))
            ? base + '.ts'
            : base + '/index.ts',
        )
      }
      throw new Error('Unexpected dependency: ' + name)
    },
  })
  return exports
}

test('Visitors sidebar destination and record links resolve inside the admin layout', () => {
  const router = load('src/router/index.ts').default
  const sidebar = readFileSync(
    new URL('../src/components/layout/Sidebar.vue', import.meta.url),
    'utf8',
  )
  const destination = sidebar.match(/key: 'visitors'[^\n]*path: '([^']+)'/)?.[1]
  assert.equal(destination, '/visitors')
  for (const path of [destination, '/visitors/visitor-record-id']) {
    const route = router.resolve(path)
    assert.equal(route.name, 'Visitors')
    assert.equal(route.matched.length, 2)
    assert.equal(route.matched[0].path, '/')
    assert.equal(route.matched[1].redirect, undefined)
    assert.notEqual(route.meta.requiresAuth, false)
  }
})
