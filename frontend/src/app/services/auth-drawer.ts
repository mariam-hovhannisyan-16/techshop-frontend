import { Injectable, signal } from '@angular/core';

export type AuthDrawerMode = 'login' | 'register';

@Injectable({
  providedIn: 'root'
})
export class AuthDrawerService {
  readonly isOpen = signal(false);
  readonly mode = signal<AuthDrawerMode>('login');
  readonly openInForgotView = signal(false);

  open(mode: AuthDrawerMode = 'login'): void {
    this.mode.set(mode);
    this.isOpen.set(true);
  }

  openForgotPassword(): void {
    this.mode.set('login');
    this.openInForgotView.set(true);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setMode(mode: AuthDrawerMode): void {
    this.mode.set(mode);
  }
}
