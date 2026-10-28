import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, modules = {}) {
  const code = ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};vm.runInNewContext(code,{exports,URL,require:name=>{assert.ok(name in modules,name);return modules[name]}});return exports;
}
const {resolveAdminEndpoints}=load('src/api/endpointPolicy.ts');
test('production API, SignalR and documents share the configured HTTPS authority',()=>{
  const value=resolveAdminEndpoints('https://api.example.invalid/api/','https://admin.example.invalid',false);
  assert.equal(value.apiUrl,'https://api.example.invalid/api');assert.equal(value.serverUrl,'https://api.example.invalid');assert.equal(value.hubUrl,'https://api.example.invalid/hubs/notifications');
});
test('production rejects missing, insecure and malformed API endpoints',()=>{
  for(const value of ['',undefined,'/api','http://api.example.invalid/api','https:api.example.invalid/api','https://api.example.invalid/wrong','https://user:synthetic@api.example.invalid/api','https://api.example.invalid/api?','https://api.example.invalid\\api'])
    assert.throws(()=>resolveAdminEndpoints(value,'https://admin.example.invalid',false));
});
test('production refuses cleartext hosting and foreign or insecure SignalR overrides',()=>{
  assert.throws(()=>resolveAdminEndpoints('https://api.example.invalid/api','http://admin.example.invalid',false));
  for(const hub of ['http://api.example.invalid/hubs/notifications','https://other.example.invalid/hubs/notifications','https://api.example.invalid/incorrect'])
    assert.throws(()=>resolveAdminEndpoints('https://api.example.invalid/api','https://admin.example.invalid',false,hub));
});
test('explicit local development proxy and hub configuration remain supported',()=>{
  const value=resolveAdminEndpoints('/api','http://localhost:5173',true,'http://localhost:5044/hubs/notifications');
  assert.equal(value.apiUrl,'http://localhost:5173/api');assert.equal(value.hubUrl,'http://localhost:5044/hubs/notifications');
});
test('document links use the secure API and reject signed URLs for another authority',()=>{
  const {formatDocUrl}=load('src/utils/documentUrl.ts',{'@/api/config':{API_URL:'https://api.example.invalid/api',SERVER_BASE_URL:'https://api.example.invalid'}});
  assert.equal(formatDocUrl('/api/files/document?ticket=synthetic'),'https://api.example.invalid/api/files/document?ticket=synthetic');
  for(const url of ['http://api.example.invalid/api/files/document?ticket=synthetic','https://other.example.invalid/api/files/document?ticket=synthetic'])assert.equal(formatDocUrl(url),'');
  assert.match(formatDocUrl('http://legacy.example.invalid/uploads/file.jpg'),/^https:\/\/api\.example\.invalid\/api\/files\/document\?url=/);
  assert.equal(formatDocUrl('uploads/photo.jpg'),'https://api.example.invalid/uploads/photo.jpg');
});
test('hosting and adapters contain no production HTTP fallback',()=>{
  const hosting=readFileSync(new URL('../vercel.json',import.meta.url),'utf8');assert.doesNotMatch(hosting,/http:\/\//);
  const proxy=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');assert.doesNotMatch(proxy,/54\.90\.173\.98/);assert.match(proxy,/resolveAdminEndpoints/);
  const api=readFileSync(new URL('../src/api/axios.ts',import.meta.url),'utf8');assert.match(api,/baseURL: API_URL/);
  const signalr=readFileSync(new URL('../src/stores/notification.store.ts',import.meta.url),'utf8');assert.match(signalr,/withUrl\(HUB_URL/);
});
