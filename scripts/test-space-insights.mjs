import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/spaceInsights.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(source, { exports, Date, URL });
const { matchesSpaceFocus, rankSpaceTasks, taskDueTime, safeBookmarkUrl } = exports;
const now = new Date(2026, 8, 8, 14, 0);
const task = (values = {}) => ({ id: 'task', title: 'Task', status: 'todo', priority: 'medium', ...values });

test('today is not overdue; completed work never appears in deadline queues', () => {
  const today = task({ dueDate: '2026-09-08' });
  assert.equal(matchesSpaceFocus(today, 'today', undefined, now), true);
  assert.equal(matchesSpaceFocus(today, 'overdue', undefined, now), false);
  assert.equal(matchesSpaceFocus(task({ dueDate: '2026-09-07' }), 'overdue', undefined, now), true);
  for (const focus of ['overdue', 'today', 'upcoming', 'priority', 'unassigned']) {
    assert.equal(matchesSpaceFocus(task({ status: 'completed', dueDate: '2026-09-07', priority: 'urgent' }), focus, undefined, now), false);
  }
});

test('date-only values use local midnight and missing dates do not enter deadline queues', () => {
  assert.equal(taskDueTime('2026-09-08'), new Date(2026, 8, 8).getTime());
  for (const dueDate of [undefined, '', 'invalid']) {
    for (const focus of ['today', 'overdue', 'upcoming']) assert.equal(matchesSpaceFocus(task({ dueDate }), focus, undefined, now), false);
  }
  assert.equal(matchesSpaceFocus(task({ dueDate: '2026-09-14' }), 'upcoming', undefined, now), true);
  assert.equal(matchesSpaceFocus(task({ dueDate: '2026-09-15' }), 'upcoming', undefined, now), false);
});

test('assignment filtering includes every assignee and fails closed without a current user', () => {
  assert.equal(matchesSpaceFocus(task({ assigneeIds: ['other', 'me'] }), 'mine', 'me', now), true);
  assert.equal(matchesSpaceFocus(task({ assigneeId: 'me' }), 'mine', 'me', now), true);
  assert.equal(matchesSpaceFocus(task(), 'mine', undefined, now), false);
  assert.equal(matchesSpaceFocus(task({ assigneeIds: ['other'] }), 'unassigned', undefined, now), false);
  assert.equal(matchesSpaceFocus(task({ assigneeIds: [] }), 'unassigned', undefined, now), true);
});

test('focus ranking puts overdue and scheduled work first without mutating input', () => {
  const tasks = [task({ id: 'unscheduled' }), task({ id: 'done', status: 'completed' }), task({ id: 'urgent', priority: 'urgent' }), task({ id: 'today', dueDate: '2026-09-08' }), task({ id: 'late', dueDate: '2026-09-06' })];
  const before = JSON.stringify(tasks);
  assert.equal(JSON.stringify(rankSpaceTasks(tasks, now).map(item => item.id)), JSON.stringify(['late', 'today', 'urgent', 'unscheduled']));
  assert.equal(JSON.stringify(tasks), before);
});

test('bookmarks accept web URLs and reject executable or malformed protocols', () => {
  assert.equal(safeBookmarkUrl('example.com/docs'), 'https://example.com/docs');
  assert.equal(safeBookmarkUrl('https://example.com'), 'https://example.com/');
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'file:///secret', 'https://', 'not a url', '']) assert.equal(safeBookmarkUrl(url), null);
});
