import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { Icon } from '../../components/icon/icon';

type VerifyState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, TranslatePipe, Toast, Icon],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  state: VerifyState = 'loading';
  tokenMissing = false;

  resendEmail = '';
  resendSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.tokenMissing = true;
      return;
    }
    this.verify(token);
  }

  private verify(token: string): void {
    this.state = 'loading';
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state = 'success';
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.state = err.status === 409 ? 'success' : 'error';
        this.cdr.detectChanges();
      }
    });
  }

  openLogin(): void {
    this.authDrawerService.open('login');
  }

  goHome(): void {
    this.router.navigate(['/products']).then();
  }

  resendVerification(): void {
    const email = this.resendEmail.trim();
    if (!email || this.resendSubmitting) return;

    this.resendSubmitting = true;
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.resendSubmitting = false;
        this.toastService.show(this.translateService.instant('VERIFICATION_EMAIL_RESENT'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.resendSubmitting = false;
        this.toastService.show(this.translateService.instant('EMAIL_VERIFICATION_NETWORK_ERROR'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
