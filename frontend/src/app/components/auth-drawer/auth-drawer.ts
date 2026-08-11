import { ChangeDetectorRef, Component, effect, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Auth, UserResponse } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { WishlistService } from '../../services/wishlist';
import { NotificationService } from '../../services/notification';
import { ToastService } from '../../services/toast';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-auth-drawer',
  imports: [FormsModule, TranslatePipe, Icon],
  templateUrl: './auth-drawer.html',
  styleUrl: './auth-drawer.scss',
})
export class AuthDrawer {
  showPassword = false;
  closing = false;

  loginIdentifierType: 'email' | 'phone' = 'email';

  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginSubmitting = false;

  registerName = '';
  registerEmail = '';
  registerPassword = '';
  registerError = '';
  registerSubmitting = false;

  forgotView = false;
  forgotEmail = '';
  forgotSubmitting = false;
  forgotSubmitted = false;

  constructor(
    public authDrawerService: AuthDrawerService,
    private authService: Auth,
    private wishlistService: WishlistService,
    private notificationService: NotificationService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    effect(() => {
      if (this.authDrawerService.openInForgotView()) {
        this.onForgotPassword();
        this.authDrawerService.openInForgotView.set(false);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.authDrawerService.isOpen()) {
      this.close();
    }
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    setTimeout(() => {
      this.authDrawerService.close();
      this.closing = false;
      this.resetForgotView();
    }, 220);
  }

  switchMode(mode: 'login' | 'register'): void {
    this.loginError = '';
    this.registerError = '';
    this.showPassword = false;
    this.resetForgotView();
    this.authDrawerService.setMode(mode);
  }

  setIdentifierType(type: 'email' | 'phone'): void {
    this.loginIdentifierType = type;
  }

  onForgotPassword(): void {
    this.loginError = '';
    this.forgotEmail = '';
    this.forgotSubmitted = false;
    this.forgotView = true;
  }

  backToLogin(): void {
    this.resetForgotView();
  }

  submitForgotPassword(): void {
    const email = this.forgotEmail.trim();
    if (!email || this.forgotSubmitting) return;

    this.forgotSubmitting = true;
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.forgotSubmitting = false;
        this.forgotSubmitted = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.forgotSubmitting = false;
        this.forgotSubmitted = true;
        this.cdr.detectChanges();
      }
    });
  }

  private resetForgotView(): void {
    this.forgotView = false;
    this.forgotEmail = '';
    this.forgotSubmitted = false;
    this.forgotSubmitting = false;
  }

  submitLogin(): void {
    this.loginError = '';
    this.loginSubmitting = true;
    this.authService.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: (response) => {
        this.loginSubmitting = false;
        this.onAuthSuccess(response.data, 'LOGIN_SUCCESS');
      },
      error: (err) => {
        this.loginSubmitting = false;
        this.loginError = err.error?.message || this.translateService.instant('LOGIN_FAILED');
        this.cdr.detectChanges();
      }
    });
  }

  private onAuthSuccess(data: { token: string; user: UserResponse }, successToastKey: string): void {
    this.authService.saveToken(data.token);
    this.authService.saveUser(data.user);
    this.wishlistService.refresh();
    this.notificationService.onLogin();

    if (successToastKey === 'REGISTER_SUCCESS') {
      this.notificationService.addWelcomeNotification(data.user.id, data.user.name);
    }
    this.toastService.show(this.translateService.instant(successToastKey), 'success');
    this.resetForms();
    this.close();

    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/products']).then();
    }
    this.cdr.detectChanges();
  }

  submitRegister(): void {
    this.registerError = '';
    this.registerSubmitting = true;
    this.authService.register({
      name: this.registerName,
      email: this.registerEmail,
      password: this.registerPassword,
      role: 'CUSTOMER'
    }).subscribe({
      next: (response) => {
        this.registerSubmitting = false;
        this.onAuthSuccess(response.data, 'REGISTER_SUCCESS');
      },
      error: (err) => {
        this.registerSubmitting = false;
        this.registerError = err.error?.message || this.translateService.instant('REGISTER_FAILED');
        this.cdr.detectChanges();
      }
    });
  }

  private resetForms(): void {
    this.loginEmail = '';
    this.loginPassword = '';
    this.loginIdentifierType = 'email';
    this.registerName = '';
    this.registerEmail = '';
    this.registerPassword = '';
    this.showPassword = false;
  }
}
