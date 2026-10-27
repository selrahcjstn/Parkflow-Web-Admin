import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const code = ts.transpileModule(source('src/features/users/services/userStatus.service.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
function service(put) {
  const exports = {}
  vm.runInNewContext(code, { exports, require: () => ({ __esModule: true, default: { put } }) })
  return exports.updateUserStatus
}

test('reactivation returns the persisted Pending Verification status', async () => {
  const update = service(async (url, body) => {
    assert.equal(url, '/users/student/status'); assert.equal(body.status, 'Active')
    return { data: { isSuccess: true, data: { id: 'student', status: 'PendingVerification' } } }
  })
  assert.equal(await update('student', 'Active'), 'PendingVerification')
})

test('transport, application and invalid-contract failures are rejected', async () => {
  await assert.rejects(service(async () => { throw Error('offline') })('student', 'Active'), /offline/)
  for (const response of [
    { isSuccess: false, message: 'rejected', data: { status: 'Active' } },
    { isSuccess: true, data: 'legacy-id' },
    { isSuccess: true, data: { status: 'Unknown' } },
  ]) await assert.rejects(service(async () => ({ data: response }))('student', 'Active'))
})

test('detail failure leaves the displayed status unchanged and emits only an error', async () => {
  const page = source('src/features/users/pages/UserDetailPage.vue')
  const handler = page.slice(page.indexOf('async function confirmStatusChange()'), page.indexOf('</script>'))
  const user = { value: { id: 'student', status: 'Suspended' } }; const toasts = []
  const context = {
    user, isUpdatingStatus: { value: false }, targetStatusToApply: { value: 'Active' },
    cachedUsers: { value: null }, isStatusConfirmOpen: { value: true },
    updateUserStatus: async () => { throw Error('offline') },
    showToast: (...args) => toasts.push(args),
  }
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
  await context.confirmStatusChange()
  assert.equal(user.value.status, 'Suspended')
  assert.deepEqual(toasts, [['offline', 'error']])
  assert.equal(context.isUpdatingStatus.value, false)
})

test('detail refresh uses API state and the hero has a single suspension indicator', () => {
  const page = source('src/features/users/pages/UserDetailPage.vue')
  assert.doesNotMatch(page, /history\.state/)
  assert.match(page, /api\.get\(`\/users\/\$\{userId.value\}`\)/)
  const hero = source('src/features/users/components/UserDetailHeroCard.vue')
  assert.doesNotMatch(hero, /Account Suspended|<UiBadge/)
  assert.match(hero, /formatStatusText\(displayStatus\(user\)\)/)
})

test('both status handlers display and cache the saved status rather than requested Active', async () => {
  for (const detail of [true, false]) {
    const page = source(`src/features/users/pages/${detail ? 'UserDetailPage' : 'UsersPage'}.vue`)
    const handler = detail
      ? page.slice(page.indexOf('async function confirmStatusChange()'), page.indexOf('</script>')) + '\n globalThis.action = confirmStatusChange'
      : page.slice(page.indexOf('const handleUpdateStatus ='), page.indexOf('const handleFormSubmit =')) + '\n globalThis.action = handleUpdateStatus'
    const toasts = []
    const context = {
      user: { value: { id: 'student', status: 'Suspended' } },
      users: { value: [{ id: 'student', status: 'Suspended' }] },
      cachedUsers: { value: [{ id: 'student', status: 'Suspended' }] },
      isUpdatingStatus: { value: false }, targetStatusToApply: { value: 'Active' },
      isStatusConfirmOpen: { value: true },
      updateUserStatus: async () => 'PendingVerification',
      showToast: (...args) => toasts.push(args),
    }
    vm.createContext(context)
    vm.runInContext(ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
    await context.action('student', 'Active')
    assert.equal(detail ? context.user.value.status : context.users.value[0].status, 'PendingVerification')
    assert.equal(context.cachedUsers.value[0].status, 'PendingVerification')
    assert.deepEqual(toasts, [['Account status updated to Pending Verification.', 'success']])
  }
})
