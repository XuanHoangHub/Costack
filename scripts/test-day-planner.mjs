import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/dayPlanner.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(source, { exports, Date, TextEncoder });
const { validDayKey, localDayKey, shiftDay, plannerStorageKey, parseDayPlans, timeToMinutes,
  conflictingBlockIds, firstFreeSlot, rankPlannerTasks, hasOpenDependencies, carryPlanForward, exportDayCalendar } = exports;
const task = (id, extra = {}) => ({ id, title: id, status: 'todo', priority: 'medium', ...extra });
const block = (id, start, duration = 30) => ({ id, taskId: id, start, duration });
const plan = (blocks = [], extra = {}) => ({ blocks, capacity: 360, note: '', ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test('calendar dates use local days and handle month, year and leap-day boundaries', () => {
  assert.equal(validDayKey('2026-02-30'), false);
  assert.equal(validDayKey('2028-02-29'), true);
  assert.equal(validDayKey('invalid'), false);
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
  assert.equal(localDayKey(new Date(2026, 8, 10, 0, 15)), '2026-09-10');
});

test('storage isolates account/workspace pairs and rejects malformed data without rewriting it', () => {
  assert.notEqual(plannerStorageKey('a:b', 'c'), plannerStorageKey('a', 'b:c'));
  assert.notEqual(plannerStorageKey('a', 'x'), plannerStorageKey('b', 'x'));
  assert.throws(() => parseDayPlans('{broken'));
  assert.throws(() => parseDayPlans('null'));
  const result = parseDayPlans(JSON.stringify({
    '2026-02-30': plan([block('invalid-date', 540)]),
    '2026-09-10': plan([block('ok', 540), block('ok', 600), block('late', 1430), block('negative', -5), null], { note: 'x'.repeat(2500), capacity: -1 }),
  }));
  assert.deepEqual(Object.keys(result), ['2026-09-10']);
  assert.deepEqual(plain(result['2026-09-10'].blocks), [block('ok', 540)]);
  assert.equal(result['2026-09-10'].note.length, 2000);
  assert.equal(result['2026-09-10'].capacity, 360);
});

test('overlap detection handles contained and adjacent blocks; slot search fills gaps', () => {
  assert.deepEqual([...conflictingBlockIds([block('a', 540, 60), block('b', 600)])], []);
  assert.deepEqual([...conflictingBlockIds([block('a', 540, 90), block('b', 550, 10)])].sort(), ['a', 'b']);
  assert.equal(firstFreeSlot([block('a', 540), block('b', 630)], 60), 570);
  assert.equal(firstFreeSlot([block('a', 540, 480), block('b', 1020, 420)], 30), null);
  assert.equal(firstFreeSlot([], 5, 1435), 1435);
  assert.equal(timeToMinutes('24:00'), null);
  assert.equal(timeToMinutes('09:45'), 585);
});

test('suggestions prioritize actionable overdue work and resolve completed dependencies', () => {
  const tasks = [task('blocked', { priority: 'urgent', relationships: { blockedBy: ['missing'] } }),
    task('done', { status: 'completed' }), task('urgent', { priority: 'urgent' }),
    task('late', { dueDate: '2026-09-09' }), task('ready', { relationships: { blockedBy: ['done'] } })];
  const before = JSON.stringify(tasks);
  assert.deepEqual(plain(rankPlannerTasks(tasks, '2026-09-10').map(item => item.id)), ['late', 'urgent', 'ready', 'blocked']);
  assert.equal(hasOpenDependencies(tasks[4], tasks), false);
  assert.equal(hasOpenDependencies(tasks[0], tasks), true);
  assert.equal(JSON.stringify(tasks), before);
});

test('carrying work preserves completed, missing, duplicate and non-fitting tasks without changing deadlines', () => {
  const source = plan([block('a', 540), block('done', 570), block('duplicate', 600), block('deleted', 630)], { note: 'today' });
  const target = plan([block('duplicate', 540)], { note: 'tomorrow' });
  const tasks = [task('a', { dueDate: '2026-09-10' }), task('done', { status: 'completed' }), task('duplicate')];
  const before = JSON.stringify({ source, target, tasks });
  const result = carryPlanForward(source, target, tasks);
  assert.equal(result.moved, 1);
  assert.deepEqual(plain(result.source.blocks.map(item => item.id)), ['done', 'duplicate', 'deleted']);
  assert.equal(result.target.blocks[1].start, 570);
  assert.equal(result.target.note, 'tomorrow');
  assert.equal(result.source.note, 'today');
  assert.equal(JSON.stringify({ source, target, tasks }), before);
  assert.equal(carryPlanForward(source, result.target, tasks).moved, 0);
  assert.equal(carryPlanForward(plan([block('a', 540)]), plan([block('full', 540, 900)]), tasks).moved, 0);
});

test('calendar export preserves Vietnamese, escapes injection and folds UTF-8 lines at 75 bytes', () => {
  const title = 'Kế hoạch, thử; nghiệm\\ hôm nay\nBEGIN:VEVENT ' + 'Tiếng Việt '.repeat(20);
  const result = exportDayCalendar('2026-09-10', [block('a', 1410), block('missing', 540)], [task('a', { title })], new Date('2026-09-10T00:00:00Z'));
  const unfolded = result.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 1);
  assert.ok(unfolded.includes('SUMMARY:Kế hoạch\\, thử\\; nghiệm\\\\ hôm nay\\nBEGIN:VEVENT'));
  const end = new Date(2026, 8, 11, 0, 0).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  assert.ok(unfolded.includes(`DTEND:${end}`));
  assert.ok(unfolded.includes('DTSTAMP:20260910T000000Z'));
  assert.ok(result.endsWith('END:VCALENDAR\r\n'));
  for (const line of result.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
});
