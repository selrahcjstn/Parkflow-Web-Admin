import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const vue = require('vue');
const { parse, compileScript } = require('@vue/compiler-sfc');
const ts = require('typescript');
const { renderToString } = require('@vue/server-renderer');
const vehicles = [
  { id: 'car', visitorId: 'person', plateNumber: 'CAR123', brand: 'Toyota', vehicleType: 2, isInside: true, totalVisits: 2 },
  { id: 'motorcycle', visitorId: 'person', plateNumber: 'MC456', brand: 'Honda', vehicleType: 0, isInside: true, totalVisits: 1 },
];
const visitor = { id: 'person', fullName: 'Visitor One', contactNumber: '09171234567', plateNumber: 'CAR123', brand: 'Toyota', vehicleType: 2, vehicles, isInside: true, totalVisits: 3 };
const visits = [{ id: 'visit-1', visitorVehicleId: 'car', plateNumber: 'CAR123', brand: 'Toyota', vehicleType: 2, status: 'Completed', entryTime: '2026-10-28T00:00:00Z', exitTime: '2026-10-28T01:00:00Z' },
  { id: 'visit-2', visitorVehicleId: 'motorcycle', plateNumber: 'MC456', brand: 'Honda', vehicleType: 0, status: 'Inside', entryTime: '2026-10-28T02:00:00Z' }];
async function render(detail, legacy = false) {
  const item = legacy ? { ...visitor, vehicles: undefined } : visitor;
  let source = readFileSync(new URL('../src/features/visitors/pages/VisitorsPage.vue', import.meta.url), 'utf8');
  source = source.replace('const visitors = ref<Visitor[]>([])', 'const visitors = ref<Visitor[]>(' + JSON.stringify([item]) + ')')
    .replace('const detail = ref<Visitor | null>(null)', 'const detail = ref<Visitor | null>(' + JSON.stringify(detail ? item : null) + ')')
    .replace('const visits = ref<Visit[]>([])', 'const visits = ref<Visit[]>(' + JSON.stringify(visits) + ')');
  const { descriptor } = parse(source);
  const compiled = compileScript(descriptor, { id: 'visitor-page', inlineTemplate: true });
  const code = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const wrapper = { setup(_, { slots }) { return () => vue.h('section', slots.default?.()); } };
  const table = { props: ['columns', 'data'], setup(props, { slots }) { return () => vue.h('table', props.data.map(item => vue.h('tr', props.columns.map(column => vue.h('td', slots['cell-' + column.key]?.({ item }) || String(item[column.key] || '')))))); } };
  const select = { props: ['options', 'label'], setup(props) { return () => vue.h('select', { 'aria-label': props.label }, props.options.map(o => vue.h('option', { value: o.value }, o.label))); } };
  const exports = {};
  vm.runInNewContext(code, { exports, console, Date, AbortController, setTimeout, clearTimeout, require(name) {
    if (name === 'vue') return { ...vue, onMounted() {}, onUnmounted() {} };
    if (name === 'vue-router') return { useRoute: () => ({ params: detail ? { id: 'person' } : {} }) };
    if (name === '@/api/axios') return { default: { get() { throw Error('SSR must not fetch'); } }, refreshAdminData() {} };
    if (name === '@/stores/notification.store') return { useAdminNotificationStore() {} };
    if (name === '@/utils/vehicleType') return { getVehicleTypeLabel: value => Number(value) === 2 ? 'Car' : 'Motorcycle' };
    if (name.endsWith('UiTable.vue')) return { __esModule: true, default: table };
    if (name.endsWith('UiSelect.vue')) return { __esModule: true, default: select };
    if (name.includes('/components/')) return { __esModule: true, default: wrapper };
    throw Error('Unexpected dependency: ' + name);
  } });
  const app = vue.createSSRApp(exports.default);
  app.component('RouterLink', { props: ['to'], setup(props, { slots }) { return () => vue.h('a', { href: props.to }, slots.default?.()); } });
  return renderToString(app);
}
test('visitor directory displays both vehicles under one visitor record', async () => {
  const html = await render(false);
  assert.match(html, /CAR123, MC456/); assert.match(html, /Toyota.*Car/); assert.match(html, /Honda.*Motorcycle/);
  assert.equal((html.match(/href="\/visitors\/person"/g) || []).length, 1);
});
test('visitor details keep identity and display vehicle-specific histories and filters', async () => {
  const html = await render(true);
  assert.match(html, /Visitor One/); assert.match(html, /09171234567/);
  assert.match(html, /Visitor vehicles/); assert.match(html, /value="car"/); assert.match(html, /value="motorcycle"/);
  assert.match(html, /CAR123/); assert.match(html, /MC456/); assert.match(html, /Completed/); assert.match(html, /On campus/);
});
test('legacy directory responses remain readable during client transition', async () => {
  assert.match(await render(false, true), /CAR123/);
});
