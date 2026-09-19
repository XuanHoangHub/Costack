import type { CustomFieldDefinition, Task } from '@/types';

const numericTypes = new Set(['number', 'money', 'rating', 'progress', 'progress_auto', 'progress_manual', 'voting']);
export const RESERVED_FIELD_NAMES = new Set(['assigneeIds', 'isMilestone', 'reminder', '__proto__', 'constructor', 'prototype']);

export function isEmptyFieldValue(value: unknown): boolean {
  return value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
}

export function fieldSelections(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : isEmptyFieldValue(value) ? [] : String(value).split(',').map(v => v.trim()).filter(Boolean);
}

export function fieldOptions(field: CustomFieldDefinition) {
  return (field.options || []).map((option, index) => typeof option === 'string'
    ? { id: `option-${index}`, label: option, color: 'indigo' }
    : option);
}

export function customFieldDefault(field: CustomFieldDefinition, now = new Date()): unknown {
  if (field.type === 'date' && field.defaultToToday) {
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
    return local.slice(0, field.includeTime ? 16 : 10);
  }
  return field.defaultValue ?? (field.type === 'checkbox' ? false : '');
}

// Defaults only fill absent keys. An explicitly cleared value stays cleared.
export function applyCustomFieldDefaults(fields: CustomFieldDefinition[], values: Record<string, unknown> = {}) {
  const next = { ...values };
  for (const field of fields) {
    if (!Object.hasOwn(next, field.name)) next[field.name] = customFieldDefault(field);
  }
  return next;
}

export function validateCustomField(field: CustomFieldDefinition, value: unknown, required = false, locale = 'vi'): string | null {
  const vi = locale === 'vi';
  if (isEmptyFieldValue(value)) return required && field.isRequired ? (vi ? 'Vui lòng điền trường bắt buộc.' : 'Please fill this required field.') : null;
  if (numericTypes.has(field.type)) {
    const number = Number(value);
    if (!Number.isFinite(number) || !['number', 'string'].includes(typeof value)) return vi ? 'Nhập một số hợp lệ.' : 'Enter a valid number.';
    const min = field.type === 'rating' || field.type === 'progress' || field.type === 'progress_auto' || field.type === 'progress_manual' || field.type === 'voting' ? 0 : field.numberMin;
    const max = field.type === 'rating' ? field.ratingMax ?? 5 : (field.type === 'progress' || field.type === 'progress_auto' || field.type === 'progress_manual') ? field.progressMax ?? 100 : field.type === 'voting' ? field.votingMax ?? 9999 : field.numberMax;
    if (min != null && number < min) return vi ? `Giá trị tối thiểu là ${min}.` : `Minimum value is ${min}.`;
    if (max != null && number > max) return vi ? `Giá trị tối đa là ${max}.` : `Maximum value is ${max}.`;
    const precision = field.type === 'rating' || field.type === 'voting' ? 0 : field.numberPrecision;
    if (precision != null && Math.abs(number - Number(number.toFixed(Math.min(10, Math.max(0, precision))))) > 1e-9) return vi ? `Chỉ được nhập tối đa ${precision} chữ số thập phân.` : `Use at most ${precision} decimal places.`;
  }
  if (field.type === 'checkbox' && ![true, false, 'true', 'false'].includes(value as boolean)) return vi ? 'Giá trị hộp kiểm không hợp lệ.' : 'Invalid checkbox value.';
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return vi ? 'Địa chỉ email không hợp lệ.' : 'Invalid email address.';
  if (field.type === 'url' || field.type === 'website') {
    try { if (!['https:', 'http:'].includes(new URL(String(value)).protocol)) throw new Error(); }
    catch { return vi ? 'Nhập đường dẫn http:// hoặc https:// hợp lệ.' : 'Enter a valid http:// or https:// URL.'; }
  }
  if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*)?$/.test(String(value)) || Number.isNaN(Date.parse(String(value))))) return vi ? 'Ngày không hợp lệ.' : 'Invalid date.';
  if (field.type === 'date') {
    const day = String(value).slice(0, 10);
    if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) return vi ? 'Ngày không tồn tại trong lịch.' : 'This date does not exist.';
  }
  if (field.type === 'dropdown' || field.type === 'labels') {
    const allowed = fieldOptions(field).flatMap(option => [option.id, option.label]);
    const selected = field.type === 'dropdown' ? [String(value)] : fieldSelections(value);
    if (selected.some(item => !allowed.includes(item))) return vi ? 'Chọn giá trị trong danh sách đã cấu hình.' : 'Select a configured option.';
  }
  return null;
}

export function validateTaskCustomFields(fields: CustomFieldDefinition[], values: Record<string, unknown> = {}, required = false, locale = 'vi') {
  return fields.flatMap(field => {
    const message = validateCustomField(field, values[field.name], required, locale);
    return message ? [{ field: field.name, message }] : [];
  });
}

export function validateFieldDefinition(field: CustomFieldDefinition, others: CustomFieldDefinition[] = [], locale = 'vi'): string | null {
  const vi = locale === 'vi';
  const name = field.name.trim();
  if (!name || [...RESERVED_FIELD_NAMES].some(key => key.toLowerCase() === name.toLowerCase())) return vi ? 'Tên trường trống hoặc được hệ thống sử dụng.' : 'Field name is empty or reserved.';
  if (others.some(other => other.id !== field.id && other.name.trim().toLowerCase() === name.toLowerCase())) return vi ? 'Tên trường đã tồn tại trong Space.' : 'A field with this name already exists in this Space.';
  if (field.numberMin != null && field.numberMax != null && field.numberMin > field.numberMax) return vi ? 'Giá trị tối thiểu phải nhỏ hơn hoặc bằng tối đa.' : 'Minimum must not exceed maximum.';
  if (field.type === 'dropdown' || field.type === 'labels') {
    const labels = fieldOptions(field).map(option => option.label.trim().toLowerCase());
    if (!labels.length || labels.some(label => !label) || new Set(labels).size !== labels.length) return vi ? 'Các lựa chọn phải có tên, không trùng nhau.' : 'Options must have unique, non-empty names.';
  }
  return validateCustomField(field, field.defaultValue, false, locale);
}

export function renameTaskCustomField(task: Task, spaceId: string, oldName: string, newName: string): Task {
  if (task.spaceId !== spaceId || oldName === newName || !Object.hasOwn(task.custom_fields || {}, oldName)) return task;
  const { [oldName]: value, ...rest } = task.custom_fields || {};
  return { ...task, custom_fields: { ...rest, [newName]: value } };
}

export function migrateTaskCustomField(task: Task, spaceId: string, previous: CustomFieldDefinition, next: CustomFieldDefinition): Task {
  if (task.spaceId !== spaceId || !Object.hasOwn(task.custom_fields || {}, previous.name)) return task;
  const renamed = renameTaskCustomField(task, spaceId, previous.name, next.name);
  if (!['dropdown', 'labels'].includes(previous.type)) return renamed;
  const remap = (value: string) => {
    const oldOption = fieldOptions(previous).find(option => option.id === value || option.label === value);
    return fieldOptions(next).find(option => option.id === oldOption?.id)?.label ?? value;
  };
  const value = renamed.custom_fields?.[next.name];
  if (isEmptyFieldValue(value)) return renamed;
  const migrated = previous.type === 'labels' ? fieldSelections(value).map(remap) : remap(String(value));
  if (JSON.stringify(migrated) === JSON.stringify(value)) return renamed;
  return { ...renamed, custom_fields: { ...renamed.custom_fields, [next.name]: migrated } };
}

export function compareCustomFieldValues(field: CustomFieldDefinition, a: unknown, b: unknown): number {
  if (isEmptyFieldValue(a) || isEmptyFieldValue(b)) return Number(isEmptyFieldValue(a)) - Number(isEmptyFieldValue(b));
  if (numericTypes.has(field.type)) return Number(a) - Number(b);
  if (field.type === 'checkbox') return Number(a === true || a === 'true') - Number(b === true || b === 'true');
  if (field.type === 'date') return Date.parse(String(a)) - Date.parse(String(b));
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function matchesCustomFieldFilter(value: unknown, operator: string, query: string): boolean {
  if (operator === 'isEmpty') return isEmptyFieldValue(value);
  if (operator === 'isNotEmpty') return !isEmptyFieldValue(value);
  const target = (Array.isArray(value) ? value.join(', ') : String(value ?? '')).toLocaleLowerCase();
  const search = query.toLocaleLowerCase();
  if (operator === 'contains') return target.includes(search);
  if (operator === 'isNot') return Array.isArray(value) ? !value.map(String).some(v => v.toLowerCase() === search) : target !== search;
  if (operator === 'gt' || operator === 'lt') return !isEmptyFieldValue(value) && query.trim() !== '' && Number.isFinite(Number(value)) && Number.isFinite(Number(query)) && (operator === 'gt' ? Number(value) > Number(query) : Number(value) < Number(query));
  return Array.isArray(value) ? value.map(String).some(v => v.toLowerCase() === search) : target === search;
}
