import { Injectable, signal } from '@angular/core';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toast = signal<ToastState | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.toast.set({ message, type });
    this.timeoutId = setTimeout(() => this.toast.set(null), 3000);
  }
}
