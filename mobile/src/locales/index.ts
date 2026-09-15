import { vi } from './vi';
import { en } from './en';
import { useUiStore } from '../store/uiStore';

export type LocaleKey = 'vi' | 'en';
export type TranslationSchema = typeof vi;

export function useTranslation() {
  const language = useUiStore((s) => s.language);
  const t = language === 'vi' ? vi : en;
  return { t, language };
}
