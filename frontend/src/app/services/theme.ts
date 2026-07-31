import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'app_theme';
export const SUPPORTED_THEMES = ['dark', 'light'] as const;
export type Theme = typeof SUPPORTED_THEMES[number];

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly current = signal<Theme>(this.readStoredTheme());

  constructor() {
    this.applyTheme(this.current());
  }

  private readStoredTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_THEMES as readonly string[]).includes(stored ?? '') ? (stored as Theme) : 'dark';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  setTheme(theme: Theme): void {
    this.current.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  toggle(): void {
    this.setTheme(this.current() === 'dark' ? 'light' : 'dark');
  }
}
