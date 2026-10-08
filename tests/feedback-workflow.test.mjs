import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const ts = require('typescript')

function workflow({ failure, paused = false } = {}) {
  const calls = []
  const record = { id: 'feedback-id', status: 1, statusName: 'Pending', description: 'Inquiry', rating: 5 }
  let release
  const gate = paused ? new Promise(resolve => { release = resolve }) : Promise.resolve()
  async function mutate(method, url, body) {
    calls.push({ method, url, body })
    await gate
    if (failure) throw { response: { data: { message: failure } } }
    record.status = method === 'put' ? body.status : body.markResolved ? 3 : 2
    record.statusName = { 1: 'Pending', 2: 'Reviewed', 3: 'Resolved' }[record.status]
    return { data: { isSuccess: true, data: { ...record } } }
  }
  const source = readFileSync(new URL('../src/features/feedback/pages/FeedbackPage.vue', import.meta.url), 'utf8')
  const { descriptor } = parse(source)
  const script = compileScript(descriptor, { id: 'feedback-workflow' })
  const code = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const cachedFeedbacks = vue.ref([{ ...record }])
  const modules = {
    vue: { ...vue, onMounted() {}, onUnmounted() {} },
    '@/api/axios': { __esModule: true, default: {
      get: async () => { calls.push({ method: 'get' }); return { data: { data: [{ ...record }] } } },
      put: (url, body) => mutate('put', url, body),
      post: (url, body) => mutate('post', url, body),
    }, refreshAdminData() {} },
    '@/stores/appCache': { cachedFeedbacks },
    '@/stores/notification.store': { useAdminNotificationStore: () => ({ onApprovalUpdate() {} }) },
  }
  const exports = {}
  vm.runInNewContext(code, {
    exports, Date, console: { error() {} }, setTimeout() {},
    require(name) {
      if (name in modules) return modules[name]
      if (name.endsWith('.vue')) return { __esModule: true, default: {} }
      throw Error('Unexpected dependency: ' + name)
    },
  })
  const state = exports.default.setup({}, { expose() {} })
  state.openDetailModal({ ...record })
  return { state, calls, record, cachedFeedbacks, release }
}

for (const [status, code] of [['Pending', 1], ['Reviewed', 2], ['Resolved', 3]]) {
  test(`Save Status persists ${status} without a reply or email request`, async () => {
    const { state, calls, record, cachedFeedbacks } = workflow()
    state.updateWorkflowStatus(status)
    await state.handleSaveStatus()
    assert.equal(calls[0].method, 'put')
    assert.equal(calls[0].url, '/feedbacks/feedback-id/status')
    assert.equal(calls[0].body.status, code)
    assert.equal(calls.filter(call => call.method === 'post').length, 0)
    assert.equal(record.statusName, status)
    assert.equal(cachedFeedbacks.value[0].statusName, status)
    assert.equal(state.activeFeedback.value.statusName, status)
    assert.equal(state.isSavingStatus.value, false)
  })
}

test('Resolved reply sends the backend markResolved field and refreshes persisted status', async () => {
  const { state, calls, cachedFeedbacks } = workflow()
  state.updateWorkflowStatus('Resolved')
  state.replyMessage.value = '  Your issue has been addressed.  '
  await state.handleSendReply()
  assert.equal(calls[0].method, 'post')
  assert.equal(calls[0].body.markResolved, true)
  assert.equal(calls[0].body.replyMessage, 'Your issue has been addressed.')
  assert.equal(calls[0].body.status, undefined)
  assert.equal(cachedFeedbacks.value[0].statusName, 'Resolved')
  assert.equal(state.isDetailModalOpen.value, false)
  assert.equal(state.isSendingReply.value, false)
})

test('workflow dropdown and resolution checkbox remain synchronized', async () => {
  const { state, record } = workflow()
  assert.equal(state.markAsResolved.value, false)
  state.updateMarkAsResolved(true)
  assert.equal(state.editStatus.value, 'Resolved')
  state.updateWorkflowStatus('Pending')
  assert.equal(state.markAsResolved.value, false)
  state.updateWorkflowStatus('Resolved')
  state.updateMarkAsResolved(false)
  assert.equal(state.editStatus.value, 'Reviewed')
  state.replyMessage.value = 'Thank you.'
  await state.handleSendReply()
  assert.equal(record.statusName, 'Reviewed')
})

test('empty reply gives a visible error instead of making a failing request', async () => {
  const { state, calls } = workflow()
  await state.handleSendReply()
  assert.equal(calls.length, 0)
  assert.match(state.feedbackError.value, /Enter a reply.*Save Status/)
  assert.equal(state.isDetailModalOpen.value, true)
})

for (const method of ['handleSaveStatus', 'handleSendReply']) {
  test(`${method} keeps the dialog open and exposes backend errors`, async () => {
    const { state } = workflow({ failure: 'Feedback record not found.' })
    state.updateWorkflowStatus('Resolved')
    state.replyMessage.value = 'Thank you.'
    await state[method]()
    assert.equal(state.feedbackError.value, 'Feedback record not found.')
    assert.equal(state.isDetailModalOpen.value, true)
    assert.equal(state.isSavingStatus.value, false)
    assert.equal(state.isSendingReply.value, false)
    assert.equal(state.activeFeedback.value.statusName, 'Pending')
  })
}

test('a pending save prevents duplicate updates, replies and closing the dialog', async () => {
  const { state, calls, release } = workflow({ paused: true })
  state.updateWorkflowStatus('Resolved')
  const saving = state.handleSaveStatus()
  assert.equal(state.isSavingStatus.value, true)
  await state.handleSaveStatus()
  await state.handleSendReply()
  state.closeDetailModal()
  assert.equal(calls.length, 1)
  assert.equal(state.isDetailModalOpen.value, true)
  release()
  await saving
  assert.equal(state.isSavingStatus.value, false)
})

test('details exposes a separate Save Status action and inline accessible failure message', () => {
  const source = readFileSync(new URL('../src/features/feedback/components/FeedbackDetailModal.vue', import.meta.url), 'utf8')
  assert.match(source, /emit\('saveStatus'\)/)
  assert.match(source, />Save Status</)
  assert.match(source, /v-if="errorMessage" role="alert"/)
  assert.match(source, /:disabled="isSendingReply \|\| isSavingStatus"/)
})
