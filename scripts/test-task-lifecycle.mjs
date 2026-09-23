import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/taskLifecycle.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(source, { exports, Date });
const { resolveTaskLocation, normalizeTaskCompletion, restoreBulkTaskFields } = exports;
const fieldExports = {};
const fieldSource = ts.transpileModule(readFileSync(new URL('../src/lib/customFields.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(fieldSource, { exports: fieldExports, Date, URL });
const spaces = [
  { id: 'a', workspaceId: 'w1', lists: [{ id: 'a1' }, { id: 'a2' }] },
  { id: 'b', workspaceId: 'w1', lists: [{ id: 'b1' }] },
  { id: 'c', workspaceId: 'w2', lists: [{ id: 'c1' }] },
];
const context = { workspaceId: 'w1', spaceId: 'a', listId: 'a2' };
const task = { id: 't', title: 'Task', status: 'todo', progress: 25, subtasks: [] };

test('explicit no-list choice survives creation inside an active list', () => {
  assert.equal(resolveTaskLocation({ spaceId: 'a', listId: undefined }, spaces, context).listId, undefined);
  assert.equal(resolveTaskLocation({}, spaces, context).listId, 'a2');
});
test('changing spaces or workspaces never carries a foreign list', () => {
  const moved = resolveTaskLocation({ spaceId: 'b', listId: 'a2' }, spaces, context);
  assert.equal(moved.spaceId, 'b');
  assert.equal(moved.listId, undefined);
  const otherWorkspace = resolveTaskLocation({ workspaceId: 'w2' }, spaces, context);
  assert.equal(otherWorkspace.workspaceId, 'w2');
  assert.equal(otherWorkspace.spaceId, 'c');
  assert.equal(otherWorkspace.listId, 'c1');
});
test('completion records time and 100 percent; reopening clears obsolete completion', () => {
  const completed = normalizeTaskCompletion({ ...task, status: 'completed' }, task, '2026-09-11T10:00:00Z');
  assert.equal(completed.progress, 100);
  assert.equal(completed.completedAt, '2026-09-11T10:00:00Z');
  assert.equal(normalizeTaskCompletion(completed, completed, 'later').completedAt, completed.completedAt);
  const reopened = normalizeTaskCompletion({ ...completed, status: 'todo' }, completed);
  assert.equal(reopened.progress, 0);
  assert.equal(reopened.completedAt, undefined);
  assert.equal(task.progress, 25);
});
test('reopening preserves explicit progress and computes existing subtask progress', () => {
  assert.equal(normalizeTaskCompletion({ ...task, progress: 40 }, { ...task, status: 'completed' }).progress, 40);
  assert.equal(normalizeTaskCompletion({ ...task, progress: 100, subtasks: [{ completed: true }, { completed: false }] }, { ...task, status: 'completed' }).progress, 50);
});
test('bulk undo restores only changed fields and preserves concurrent edits', () => {
  const before = { ...task, priority: 'low', assigneeIds: ['one'] };
  const current = { ...before, priority: 'high', title: 'New title', commentsCount: 3, assigneeIds: ['two'] };
  const restored = restoreBulkTaskFields(current, before, ['priority']);
  assert.equal(restored.priority, 'low');
  assert.equal(restored.title, 'New title');
  assert.equal(restored.commentsCount, 3);
  assert.equal(restored.assigneeIds[0], 'two');
  assert.equal(current.priority, 'high');
});

// Exercise the real application create handler with controlled network failures.
const appSource = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const createSource = appSource.slice(appSource.indexOf('  const handleAddTask = useCallback'), appSource.indexOf('  const handleUpdateTask = useCallback'));
const createJs = ts.transpileModule(`${createSource}\nexports.createTask = handleAddTask;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function createHarness({ offline = false, fail = false, customFields = [] } = {}) {
  const state = { tasks: [], queue: {}, deleted: [], inserts: [], reminders: [] };
  const harnessSpaces = spaces.map(space => ({ ...space, customFields }));
  const bindings = {
    exports: {}, crypto: webcrypto, console: { error() {} },
    useCallback: fn => fn, currentUser: { id: 'me' }, members: [], spaces,
    activeWorkspaceId: 'w1', activeSpaceId: 'a', activeListId: 'a2', isOffline: offline,
    triggerToast() {}, addSyncLog() {}, isUserAssignedToTask: () => false,
    resolveTaskLocation, normalizeTaskCompletion,
    applyCustomFieldDefaults: fieldExports.applyCustomFieldDefaults,
    validateTaskCustomFields: fieldExports.validateTaskCustomFields,
    buildTaskCustomFields: task => task.custom_fields || {},
    saveTaskReminder: (...args) => state.reminders.push(args),
    useSpaceStore: { getState: () => ({ spaces: harnessSpaces }) },
    setTasks: update => { state.tasks = update(state.tasks); },
    setOfflineTasksQueue: update => { state.queue = update(state.queue); },
    setOfflineDeletedTasks: update => { state.deleted = update(state.deleted); },
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'me' } } } }) },
      from: () => ({ insert: async rows => { state.inserts.push(...rows); return { error: fail ? { message: 'Network unavailable' } : null }; } }),
    },
  };
  vm.runInNewContext(createJs, bindings);
  return { state, create: bindings.exports.createTask };
}

test('all task creation entry points apply Space defaults before persistence', async () => {
  const { state, create } = createHarness({ customFields: [{ id: 'budget', name: 'Budget', type: 'money', defaultValue: 0 }] });
  await create({ ...task, custom_fields: { Approved: false } });
  assert.equal(state.tasks[0].custom_fields.Budget, 0);
  assert.equal(state.tasks[0].custom_fields.Approved, false);
  assert.equal(state.inserts[0].custom_fields.Budget, 0);
});

test('completed tasks missing required Space fields never enter local state or the database', async () => {
  const { state, create } = createHarness({ customFields: [{ id: 'budget', name: 'Budget', type: 'money', isRequired: true }] });
  await assert.rejects(() => create({ ...task, status: 'completed' }), /Budget/);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.inserts.length, 0);
});
test('rapid creation produces unique IDs, retains attachments and uses the destination workspace', async () => {
  const { state, create } = createHarness();
  const attachment = { id: 'file', name: 'brief.pdf', filePath: 'uploads/brief.pdf' };
  await Promise.all(Array.from({ length: 20 }, () => create({ ...task, workspaceId: 'w2', attachments: [attachment], reminder: '1d', dueDate: '2026-09-20' })));
  assert.equal(new Set(state.tasks.map(task => task.id)).size, 20);
  assert.equal(state.inserts.length, 20);
  assert.equal(state.inserts[0].workspace_id, 'w2');
  assert.equal(state.inserts[0].space_id, 'c');
  assert.equal(state.inserts[0].attachments[0].filePath, attachment.filePath);
  assert.equal(state.reminders[0][0], state.tasks[0].id);
});
test('failed online saves retain the complete task in the retry queue', async () => {
  const { state, create } = createHarness({ fail: true });
  await create({ ...task, spaceId: 'a', listId: undefined });
  const created = state.tasks[0];
  assert.equal(state.queue[created.id], created);
  assert.equal(state.inserts.length, 1);
  assert.equal(state.inserts[0].workspace_id, 'w1');
  assert.equal(created.listId, undefined);
});
test('offline completed tasks retain normalized completion metadata for synchronization', async () => {
  const { state, create } = createHarness({ offline: true });
  await create({ ...task, status: 'completed' });
  const created = state.tasks[0];
  assert.equal(created.progress, 100);
  assert.ok(created.completedAt);
  assert.equal(state.queue[created.id], created);
  assert.equal(state.inserts.length, 0);
});

test('tasks created without explicit priority default to medium and never pass null priority to database', async () => {
  const { state, create } = createHarness();
  await create({ ...task, priority: undefined });
  assert.equal(state.tasks[0].priority, 'medium');
  assert.equal(state.inserts[0].priority, 'medium');
  assert.notEqual(state.inserts[0].priority, null);
});

const updateSource = appSource.slice(appSource.indexOf('  const handleUpdateTask = useCallback'), appSource.indexOf('  const handleRestoreTask = useCallback'));
const updateJs = ts.transpileModule(`${updateSource}\nexports.updateTask = handleUpdateTask;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function createUpdateHarness({ existingTasks = [], fail = false, notNullError = false } = {}) {
  const state = { tasks: [...existingTasks], queue: {}, updates: [] };
  let notNullAttempts = 0;
  const bindings = {
    exports: {}, crypto: webcrypto, console: { error() {} },
    useCallback: fn => fn, currentUser: { id: 'me' }, members: [], spaces,
    activeWorkspaceId: 'w1', activeSpaceId: 'a', activeListId: 'a2', isOffline: false,
    triggerToast() {}, addSyncLog() {}, isUserAssignedToTask: () => false,
    getIncompleteBlockers: () => [],
    resolveTaskLocation, normalizeTaskCompletion,
    applyCustomFieldDefaults: fieldExports.applyCustomFieldDefaults,
    validateTaskCustomFields: fieldExports.validateTaskCustomFields,
    buildTaskCustomFields: task => task.custom_fields || {},
    saveTaskReminder: () => {},
    useSpaceStore: { getState: () => ({ spaces: spaces.map(s => ({ ...s, customFields: [] })) }) },
    useTaskStore: { getState: () => ({ tasks: state.tasks }) },
    setTasks: update => { state.tasks = update(state.tasks); },
    setOfflineTasksQueue: update => { state.queue = update(state.queue); },
    setOfflineDeletedTasks: () => {},
    handleAddTask: async () => {},
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'me' } } } }) },
      from: () => ({
        update: payload => ({
          eq: async () => {
            state.updates.push(payload);
            if (notNullError && payload.priority === null) {
              notNullAttempts++;
              return { error: { message: 'null value in column "priority" of relation "tasks" violates not-null constraint' } };
            }
            return { error: fail ? { message: 'Network unavailable' } : null };
          }
        })
      }),
    },
  };
  vm.runInNewContext(updateJs, bindings);
  return { state, update: bindings.exports.updateTask, getAttempts: () => notNullAttempts };
}

test('updating task with missing priority preserves old priority and never sends null', async () => {
  const initialTask = { ...task, id: 'task-1', priority: 'high' };
  const { state, update } = createUpdateHarness({ existingTasks: [initialTask] });
  await update({ id: 'task-1', title: 'Updated title', status: 'inprogress' });
  assert.equal(state.tasks[0].priority, 'high');
  assert.equal(state.updates[0].priority, 'high');
  assert.notEqual(state.updates[0].priority, null);
});

test('updating task with undefined priority when old task had no priority defaults safely to medium', async () => {
  const initialTask = { ...task, id: 'task-2', priority: undefined };
  const { state, update } = createUpdateHarness({ existingTasks: [initialTask] });
  await update({ id: 'task-2', title: 'Updated title', status: 'completed' });
  assert.equal(state.tasks[0].priority, 'medium');
  assert.equal(state.updates[0].priority, 'medium');
  assert.notEqual(state.updates[0].priority, null);
});

