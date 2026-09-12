"use client";
import type { CustomFieldDefinition, Task, User } from '@/types';
import { fieldOptions, fieldSelections, isEmptyFieldValue } from '@/lib/customFields';
import { useTranslation } from '@/contexts/TranslationContext';

export default function CustomFieldSummary({ fields, task, members }: { fields: CustomFieldDefinition[]; task: Task; members: User[] }) {
  const { locale } = useTranslation();
  const visible = fields.filter(field => !isEmptyFieldValue(task.custom_fields?.[field.name]));
  if (!visible.length) return null;
  const format = (field: CustomFieldDefinition) => {
    const value = task.custom_fields?.[field.name];
    if (field.type === 'checkbox') return value === true || value === 'true' ? (locale === 'vi' ? 'Có' : 'Yes') : (locale === 'vi' ? 'Không' : 'No');
    if (field.type === 'member') return fieldSelections(value).map(id => members.find(member => member.id === id)?.name || id).join(', ');
    if (field.type === 'dropdown' || field.type === 'labels') return fieldSelections(value).map(item => fieldOptions(field).find(option => option.id === item)?.label || item).join(', ');
    if (['number', 'money', 'progress'].includes(field.type) && Number.isFinite(Number(value))) {
      const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: field.numberPrecision ?? 2 }).format(Number(value));
      if (field.type === 'money') return field.currencyPosition === 'prefix' ? `${field.currencySymbol || '₫'} ${formatted}` : `${formatted} ${field.currencySymbol || '₫'}`;
      return formatted + (field.type === 'progress' || field.numberFormat === 'percent' ? '%' : field.numberUnit ? ` ${field.numberUnit}` : '');
    }
    return String(value);
  };
  return <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
    {visible.slice(0, 3).map(field => <div key={field.id} className="flex min-w-0 items-center justify-between gap-2"><dt className="truncate text-slate-400">{field.name}</dt><dd className="max-w-[60%] truncate font-medium text-slate-600 dark:text-slate-300" title={format(field)}>{format(field)}</dd></div>)}
    {visible.length > 3 && <div className="text-slate-400">+{visible.length - 3} {locale === 'vi' ? 'trường khác' : 'more fields'}</div>}
  </dl>;
}
