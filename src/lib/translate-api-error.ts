import type { Translations } from "@/locales/translations";

export function translateApiError(
  error: string | undefined,
  t: Translations
): string | undefined {
  if (!error) return undefined;
  return t.apiErrors[error] ?? error;
}
