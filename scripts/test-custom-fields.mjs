import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/customFields.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(source, { exports, Date, URL });
const { isEmptyFieldValue, customFieldDefault, applyCustomFieldDefaults, validateCustomField, validateTaskCustomFields, validateFieldDefinition, renameTaskCustomField, migrateTaskCustomField, compareCustomFieldValues, matchesCustomFieldFilter } = exports;
const field = { id: 'budget', name: 'Budget', type: 'money', numberMin: 0, numberMax: 100, numberPrecision: 2, isRequired: true };

test('zero and false are valid values, while whitespace and empty lists are empty', () => {
  for (const value of [0, false, '0', 'false']) assert.equal(isEmptyFieldValue(value), false);
  for (const value of [undefined, null, '', '   ', []]) assert.equal(isEmptyFieldValue(value), true);
  assert.equal(validateCustomField(field, 0, true), null);
  assert.equal(validateCustomField({ ...field, type: 'checkbox' }, false, true), null);
});

test('defaults preserve explicitly cleared, zero, false, and unrelated task metadata', () => {
  const fields = [field, { id: 'check', name: 'Approved', type: 'checkbox', defaultValue: true }];
  const values = applyCustomFieldDefaults(fields, { Budget: 0, Approved: false, reminder: '1h' });
  assert.equal(values.Budget, 0); assert.equal(values.Approved, false); assert.equal(values.reminder, '1h');
  assert.equal(applyCustomFieldDefaults([{ ...field, defaultValue: 20 }], { Budget: '' }).Budget, '');
  assert.equal(applyCustomFieldDefaults([{ ...field, defaultValue: 20 }]).Budget, 20);
});

test('date defaults respect local date and optional time', () => {
  const date = new Date(2026, 8, 12, 9, 5);
  assert.equal(customFieldDefault({ ...field, type: 'date', defaultToToday: true }, date), '2026-09-12');
  assert.equal(customFieldDefault({ ...field, type: 'date', defaultToToday: true, includeTime: true }, date), '2026-09-12T09:05');
});

test('required values are enforced on completion, not on draft creation', () => {
  assert.equal(validateTaskCustomFields([field], {}, false).length, 0);
  assert.equal(validateTaskCustomFields([field], {}, true).length, 1);
  assert.equal(validateTaskCustomFields([field], { Budget: 0 }, true).length, 0);
});

test('numeric limits, precision, email and safe URL formats are enforced', () => {
  for (const value of [-1, 101, 'abc', Infinity, 1.123, [2], true]) assert.ok(validateCustomField(field, value));
  for (const value of [0, 100, 1.23]) assert.equal(validateCustomField(field, value), null);
  assert.ok(validateCustomField({ ...field, type: 'email' }, 'invalid'));
  assert.equal(validateCustomField({ ...field, type: 'email' }, 'test@example.com'), null);
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'invalid']) assert.ok(validateCustomField({ ...field, type: 'url' }, value));
  assert.equal(validateCustomField({ ...field, type: 'url' }, 'https://example.com'), null);
  assert.ok(validateCustomField({ ...field, type: 'date' }, '2026-02-31'));
  assert.equal(validateCustomField({ ...field, type: 'date' }, '2028-02-29T12:30'), null);
});

test('field definitions reject reserved names, duplicate names, options and invalid ranges', () => {
  assert.ok(validateFieldDefinition({ ...field, name: 'reminder' }));
  assert.ok(validateFieldDefinition({ ...field, id: 'other', name: ' BUDGET ' }, [field]));
  assert.equal(validateFieldDefinition(field, [field]), null);
  assert.ok(validateFieldDefinition({ ...field, numberMin: 101 }));
  assert.ok(validateFieldDefinition({ ...field, type: 'dropdown', options: ['One', 'one'] }));
  assert.ok(validateFieldDefinition({ ...field, type: 'dropdown', options: [''] }));
});

test('renaming never changes tasks in other Spaces or drops false/zero values', () => {
  for (const value of [0, false, '']) {
    const task = { id: 't', spaceId: 'one', custom_fields: { Budget: value, reminder: '1h' } };
    assert.equal(renameTaskCustomField(task, 'two', 'Budget', 'Cost'), task);
    const next = renameTaskCustomField(task, 'one', 'Budget', 'Cost');
    assert.equal(next.custom_fields.Cost, value);
    assert.equal(Object.hasOwn(next.custom_fields, 'Budget'), false);
    assert.equal(next.custom_fields.reminder, '1h');
    assert.equal(task.custom_fields.Budget, value);
  }
});

test('option rename migrates dropdown and labels using option identity without dropping removed values', () => {
  const previous = { id: 'region', name: 'Region', type: 'labels', options: [{ id: 'north', label: 'North', color: 'blue' }] };
  const next = { ...previous, name: 'Market', options: [{ id: 'north', label: 'Northern', color: 'blue' }] };
  const task = { id: 't', spaceId: 'one', custom_fields: { Region: ['North', 'Legacy'] } };
  const migrated = migrateTaskCustomField(task, 'one', previous, next);
  assert.equal(JSON.stringify(migrated.custom_fields.Market), JSON.stringify(['Northern', 'Legacy']));
  assert.equal(migrateTaskCustomField(task, 'other', previous, next), task);
});

test('sort uses numeric semantics and filters keep zero and false searchable', () => {
  assert.ok(compareCustomFieldValues(field, 2, 10) < 0);
  assert.ok(compareCustomFieldValues(field, '', 0) > 0);
  assert.equal(matchesCustomFieldFilter(0, 'isEmpty', ''), false);
  assert.equal(matchesCustomFieldFilter(false, 'is', 'false'), true);
  assert.equal(matchesCustomFieldFilter(10, 'gt', '2'), true);
  assert.equal(matchesCustomFieldFilter('', 'lt', '2'), false);
  assert.equal(matchesCustomFieldFilter(['North', 'South'], 'is', 'south'), true);
});
