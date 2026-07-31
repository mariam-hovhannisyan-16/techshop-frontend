import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { Toast } from '../../components/toast/toast';
import { Icon } from '../../components/icon/icon';

type ResetState = 'form' | 'success' | 'error';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, TranslatePipe, Toast, Icon],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  state: ResetState = 'form';
  tokenMissing = false;
  passwordMismatch = false;

  newPassword = '';
  confirmPassword = '';
  submitting = false;

  private token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.state = 'error';
      this.tokenMissing = true;
    }
  }

  submitReset(): void {
    if (!this.token || this.submitting) return;

    this.passwordMismatch = this.newPassword !== this.confirmPassword;
    if (this.passwordMismatch) return;

    this.submitting = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.submitting = false;
        this.state = 'success';
        this.cdr.detectChanges();
      },
      error: () => {
        this.submitting = false;
        this.state = 'error';
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
}
