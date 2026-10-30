import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { LanguageDto } from '../models/language.models';
import { ProfileService } from './profile.service';

const FALLBACK_LANGUAGES: LanguageDto[] = [
  { id: 'pl', code: 'pl', name: 'Polski', flagEmoji: '🇵🇱', isDefault: true },
  { id: 'en', code: 'en', name: 'English', flagEmoji: '🇬🇧', isDefault: false }
];

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly profileService = inject(ProfileService);
  private readonly STORAGE_LANG_KEY = 'granary_lang';
  private readonly STORAGE_DICT_PREFIX = 'granary_dict_';

  readonly availableLanguages = signal<LanguageDto[]>([]);
  readonly currentLang = signal<string>(this.getInitialLang());
  readonly dictionary = signal<Record<string, string>>(this.getCachedDictionary(this.getInitialLang()));

  readonly currentLanguageDetails = computed(() =>
    this.availableLanguages().find((l: LanguageDto) => l.code === this.currentLang())
  );

  constructor() {
    this.fetchLanguages();
    this.loadTranslations(this.currentLang());
    
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.currentLang();
    }
  }

  translate(key: string, defaultVal = ''): string {
    return this.dictionary()[key] ?? defaultVal ?? key;
  }

  setLanguage(langCode: string, syncBackend = true): void {
    this.currentLang.set(langCode);
    localStorage.setItem(this.STORAGE_LANG_KEY, langCode);
    this.dictionary.set(this.getCachedDictionary(langCode));

    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode;
    }

    this.loadTranslations(langCode);

    if (syncBackend) {
      this.profileService.updateLanguage(langCode).subscribe({
        error: (err: unknown) => console.warn('[TranslationService] Błąd synchronizacji języka:', err)
      });
    }
  }

  loadTranslations(langCode: string): void {
    const url = `${this.apiBaseUrl}/translations/${langCode}`;
    this.http.get<Record<string, string>>(url).subscribe({
      next: (dict: Record<string, string>) => {
        this.dictionary.set(dict || {});
        localStorage.setItem(`${this.STORAGE_DICT_PREFIX}${langCode}`, JSON.stringify(dict));
      },
      error: (err: unknown) => console.error('Błąd pobierania słownika:', err)
    });
  }

  fetchLanguages(): void {
    this.http.get<unknown>(`${this.apiBaseUrl}/languages`).subscribe({
      next: response => {
        const languages = this.extractLanguages(response);
        this.availableLanguages.set(languages.length > 0 ? languages : FALLBACK_LANGUAGES);
      },
      error: (err: unknown) => {
        console.warn('Błąd pobierania listy języków:', err);
        this.availableLanguages.set(FALLBACK_LANGUAGES);
      }
    });
  }

  private extractLanguages(response: unknown): LanguageDto[] {
    let payload = response;
    if (!Array.isArray(payload) && typeof payload === 'object' && payload !== null) {
      const envelope = payload as {
        data?: unknown;
        result?: unknown;
        items?: unknown;
        languages?: unknown;
      };
      payload = envelope.data ?? envelope.result ?? envelope.items ?? envelope.languages;
      if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
        const nested = payload as { items?: unknown; languages?: unknown };
        payload = nested.items ?? nested.languages;
      }
    }

    if (!Array.isArray(payload)) return [];

    return payload.filter((language): language is LanguageDto =>
      typeof language === 'object' &&
      language !== null &&
      typeof language.id === 'string' &&
      typeof language.code === 'string' &&
      typeof language.name === 'string' &&
      typeof language.flagEmoji === 'string' &&
      typeof language.isDefault === 'boolean'
    );
  }

  private getInitialLang(): string {
    const saved = localStorage.getItem(this.STORAGE_LANG_KEY);
    if (saved) return saved;
    const browser = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'pl';
    return browser === 'pl' ? 'pl' : 'en';
  }

  private getCachedDictionary(langCode: string): Record<string, string> {
    try {
      const item = localStorage.getItem(`${this.STORAGE_DICT_PREFIX}${langCode}`);
      return item ? JSON.parse(item) : {};
    } catch {
      return {};
    }
  }
}