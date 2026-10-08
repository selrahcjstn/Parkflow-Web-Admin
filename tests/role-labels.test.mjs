import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/role.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
vm.runInNewContext(code, { exports })
const label = exports.getRoleLabel

test('client role labels preserve legacy API codes without confusing faculty and university staff', () => {
  for (const role of ['UniversityStaff', 'Faculty', 'FacultyMember', 'faculty', 'Faculty Member']) {
    assert.equal(label(role), 'Faculty')
  }
  for (const role of ['NonAcademicPersonnel', 'Staff', 'University Staff', 'university staff']) {
    assert.equal(label(role), 'University Staff')
  }
  assert.equal(label('student'), 'Student')
  assert.equal(label('Student'), 'Student')
  assert.equal(label('Visitor'), 'Visitor')
  assert.equal(label(undefined), 'N/A')
})

test('client registration and filters keep persisted role codes unchanged', () => {
  const filters = readFileSync(new URL('../src/features/users/components/UserFilters.vue', import.meta.url), 'utf8')
  assert.match(filters, /label: `Faculty \(\$\{props.facultyCount\}\)`, value: 'UniversityStaff'/)
  assert.match(filters, /label: `University Staff \(\$\{props.staffCount\}\)`, value: 'NonAcademicPersonnel'/)
  const registration = readFileSync(new URL('../src/features/users/components/RoleSelectorCard.vue', import.meta.url), 'utf8')
  assert.match(registration, /selectRole\('UniversityStaff'\)/)
  assert.match(registration, />Faculty<\/h4>/)
  assert.match(registration, /selectRole\('NonAcademicPersonnel'\)/)
  assert.match(registration, />University Staff<\/h4>/)
})
