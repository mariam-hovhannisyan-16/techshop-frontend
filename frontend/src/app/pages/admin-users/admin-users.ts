import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminUserService, AdminUser } from '../../services/admin-user';
import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, Toast],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  users: AdminUser[] = [];
  loading = true;
  errorMessage = '';
  savingId: number | null = null;

  constructor(
    private adminUserService: AdminUserService,
    private authService: Auth,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminUserService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_USERS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isAdminRole(role: string): boolean {
    return role === 'ADMIN';
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.authService.getUserId();
  }

  toggleRole(user: AdminUser): void {
    if (this.savingId || this.isSelf(user)) return;

    const promoting = !this.isAdminRole(user.role);
    const confirmKey = promoting ? 'ADMIN_CONFIRM_PROMOTE' : 'ADMIN_CONFIRM_DEMOTE';
    const confirmed = window.confirm(this.translateService.instant(confirmKey, { name: user.name }));
    if (!confirmed) return;

    const newRole: 'CUSTOMER' | 'ADMIN' = promoting ? 'ADMIN' : 'CUSTOMER';
    this.savingId = user.id;

    this.adminUserService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        user.role = newRole;
        this.savingId = null;
        this.toastService.show(this.translateService.instant('ADMIN_ROLE_UPDATE_SUCCESS'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingId = null;
        this.toastService.show(this.translateService.instant('ADMIN_ROLE_UPDATE_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
