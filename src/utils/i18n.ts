export type Language = 'PT' | 'ENG';

/** A translator function: returns the PT or EN string for the active language. */
export type Translator = (pt: string, en: string) => string;

/**
 * Creates a translator bound to the given language. Centralizes the previously
 * duplicated inline `t(pt, en)` helpers across the app into a single source.
 */
export function createTranslator(language: Language): Translator {
  return (pt, en) => (language === 'PT' ? pt : en);
}
