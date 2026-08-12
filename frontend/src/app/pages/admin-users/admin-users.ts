import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminUserService, AdminUser } from '../../services/admin-user';
import { OrderService, OrderResponse, OrderStatus, ORDER_STATUS_TRANSITIONS } from '../../services/order';
import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { PricePipe } from '../../pipes/price';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, Toast, PricePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  users: AdminUser[] = [];
  loading = true;
  errorMessage = '';
  savingId: number | null = null;

  ordersModalUser: AdminUser | null = null;
  ordersModalOrders: OrderResponse[] = [];
  ordersModalLoading = false;
  ordersModalError = '';
  updatingOrderStatusId: number | null = null;

  constructor(
    private adminUserService: AdminUserService,
    private orderService: OrderService,
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
        this.users = [...response.data].sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
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

  viewOrders(user: AdminUser): void {
    this.ordersModalUser = user;
    this.ordersModalOrders = [];
    this.ordersModalError = '';
    this.ordersModalLoading = true;

    this.orderService.getOrdersForUserAdmin(user.id).subscribe({
      next: (response) => {
        this.ordersModalOrders = [...response.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.ordersModalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.ordersModalError = 'ADMIN_FAILED_TO_LOAD_USER_ORDERS';
        this.ordersModalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeOrdersModal(): void {
    this.ordersModalUser = null;
    this.ordersModalOrders = [];
    this.ordersModalError = '';
  }

  nextStatusOptions(order: OrderResponse): OrderStatus[] {
    return ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  }

  updateOrderStatus(order: OrderResponse, newStatus: string): void {
    if (!newStatus || this.updatingOrderStatusId) return;

    this.updatingOrderStatusId = order.id;
    this.orderService.updateOrderStatusAdmin(order.id, newStatus as OrderStatus).subscribe({
      next: (response) => {
        order.status = response.data.status;
        this.updatingOrderStatusId = null;
        this.toastService.show(this.translateService.instant('ADMIN_ORDER_STATUS_UPDATE_SUCCESS'), 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.updatingOrderStatusId = null;
        this.toastService.show(
          err.error?.message || this.translateService.instant('ADMIN_ORDER_STATUS_UPDATE_FAILED'),
          'error'
        );
        this.cdr.detectChanges();
      }
    });
  }
}
