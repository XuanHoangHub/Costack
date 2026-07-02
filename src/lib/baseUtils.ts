import { BaseApp, BaseField, BaseRecord, BaseTable, BaseView, BaseViewFilter, BaseViewSort, User } from '../types';

export function getActiveTable(base: BaseApp): BaseTable | undefined {
  return base.tables.find(t => t.id === base.activeTableId) || base.tables[0];
}

export function getActiveView(table: BaseTable, viewId?: string): BaseView | undefined {
  if (viewId) return table.views.find(v => v.id === viewId);
  return table.views[0];
}

export function getFieldValue(record: BaseRecord, fieldId: string): unknown {
  return record.values[fieldId];
}

export function getPrimaryValue(record: BaseRecord, table: BaseTable): string {
  const val = record.values[table.primaryFieldId];
  return val != null ? String(val) : 'Untitled';
}

export function applyFilters(records: BaseRecord[], filters: BaseViewFilter[] = [], fields: BaseField[]): BaseRecord[] {
  if (!filters.length) return records;
  return records.filter(record => {
    return filters.every(f => {
      const val = record.values[f.fieldId];
      const field = fields.find(fd => fd.id === f.fieldId);
      switch (f.operator) {
        case 'empty':
          return val == null || val === '' || (Array.isArray(val) && val.length === 0);
        case 'not_empty':
          return val != null && val !== '' && !(Array.isArray(val) && val.length === 0);
        case 'equals':
          return String(val) === String(f.value);
        case 'contains':
          return String(val || '').toLowerCase().includes(String(f.value || '').toLowerCase());
        case 'gt':
          return Number(val) > Number(f.value);
        case 'lt':
          return Number(val) < Number(f.value);
        default:
          return true;
      }
    });
  });
}

export function applySorts(records: BaseRecord[], sorts: BaseViewSort[] = []): BaseRecord[] {
  if (!sorts.length) return records;
  const sorted = [...records];
  sorted.sort((a, b) => {
    for (const sort of sorts) {
      const av = a.values[sort.fieldId];
      const bv = b.values[sort.fieldId];
      const aStr = av == null ? '' : String(av);
      const bStr = bv == null ? '' : String(bv);
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

export function processRecords(table: BaseTable, view?: BaseView): BaseRecord[] {
  let records = [...table.records];
  if (view?.config.filters?.length) {
    records = applyFilters(records, view.config.filters, table.fields);
  }
  if (view?.config.sorts?.length) {
    records = applySorts(records, view.config.sorts);
  }
  return records;
}

export function getOptionLabel(field: BaseField, optionId: unknown): string {
  if (!field.options || optionId == null) return String(optionId ?? '');
  const opt = field.options.find(o => o.id === optionId);
  return opt?.label ?? String(optionId);
}

export function getOptionColor(field: BaseField, optionId: unknown): string {
  if (!field.options || optionId == null) return '#6366f1';
  const opt = field.options.find(o => o.id === optionId);
  return opt?.color ?? '#6366f1';
}

export function getPersonName(members: User[], personId: unknown): string {
  if (!personId) return '';
  const member = members.find(m => m.id === personId);
  return member?.name ?? String(personId);
}

export function formatFieldDisplay(value: unknown, field: BaseField, members: User[] = []): string {
  if (value == null || value === '') return '';
  switch (field.type) {
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'single_select':
      return getOptionLabel(field, value);
    case 'multi_select':
      return Array.isArray(value)
        ? value.map(v => getOptionLabel(field, v)).join(', ')
        : String(value);
    case 'person':
      return getPersonName(members, value);
    case 'currency':
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
    case 'percent':
      return `${value}%`;
    case 'rating':
      return '★'.repeat(Number(value) || 0);
    case 'date':
      try {
        return new Date(String(value)).toLocaleDateString('vi-VN');
      } catch {
        return String(value);
      }
    default:
      return String(value);
  }
}

export function updateBaseTable(base: BaseApp, tableId: string, updater: (table: BaseTable) => BaseTable): BaseApp {
  return {
    ...base,
    updatedAt: new Date().toISOString(),
    tables: base.tables.map(t => t.id === tableId ? updater(t) : t),
  };
}

export function createEmptyRecord(table: BaseTable): BaseRecord {
  const values: Record<string, unknown> = {};
  table.fields.forEach(f => {
    if (f.type === 'checkbox') values[f.id] = false;
    else if (f.type === 'multi_select') values[f.id] = [];
    else if (f.type === 'rating') values[f.id] = 0;
    else if (f.type === 'percent') values[f.id] = 0;
    else if (f.type === 'number' || f.type === 'currency') values[f.id] = 0;
  });
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    values,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultField(type: BaseField['type'] = 'text'): BaseField {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'New Field',
    type,
    width: 160,
    options: type === 'single_select' || type === 'multi_select'
      ? [
          { id: 'o1', label: 'Option 1', color: '#6366f1' },
          { id: 'o2', label: 'Option 2', color: '#10b981' },
        ]
      : undefined,
  };
}
