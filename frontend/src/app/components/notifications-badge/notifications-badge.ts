import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NotificationService, NotificationResponse } from '../../services/notification';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { Icon } from '../icon/icon';
import { PricePipe } from '../../pipes/price';

const WELCOME_PATTERN = /^Welcome to TechShopArmenia, (.+)!$/;
const VERIFY_EMAIL_MESSAGE = 'Please verify your email to activate your TechShopArmenia account.';
const ORDER_CREATED_PATTERN = /^Your order #(\d+) has been created\. Total: ([\d.]+) AMD$/;
const ORDER_ID_PATTERN = /order #(\d+)/i;

@Component({
  selector: 'app-notifications-badge',
  imports: [CommonModule, TranslatePipe, Icon],
  providers: [PricePipe],
  templateUrl: './notifications-badge.html',
  styleUrl: './notifications-badge.scss',
})
export class NotificationsBadge {
  open = false;

  constructor(
    private notificationService: NotificationService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private translateService: TranslateService,
    private toastService: ToastService,
    private pricePipe: PricePipe,
    private router: Router
  ) {}

  get count(): number {
    return this.notificationService.unreadCount();
  }

  get notifications(): NotificationResponse[] {
    return this.notificationService.items();
  }

  toggle(): void {
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.open = !this.open;
    if (!this.open) return;

    const userId = this.authService.getUserId();
    if (!userId) return;

    this.notificationService.getNotifications(userId).subscribe({
      next: () => this.bulkMarkAllAsRead().subscribe({ error: () => {} }),
      error: () => {}
    });
  }

  private bulkMarkAllAsRead(): Observable<unknown> {
    const unread = this.notifications.filter(n => !n.read);
    if (unread.length === 0) return of(null);
    return forkJoin(unread.map(n => this.notificationService.markAsRead(n.id)));
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    this.bulkMarkAllAsRead().subscribe({
      next: () => this.toastService.show(this.translateService.instant('TOAST_ALL_MARKED_READ'), 'success'),
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_MARK_READ'), 'error')
    });
  }

  clearNotifications(event: Event): void {
    event.stopPropagation();
    if (this.notifications.length === 0) return;

    const userId = this.authService.getUserId();
    if (!userId) return;
    this.notificationService.clearAll(userId);
    this.toastService.show(this.translateService.instant('TOAST_NOTIFICATIONS_CLEARED'), 'success');
  }

  select(notification: NotificationResponse): void {
    this.open = false;
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({ error: () => {} });
    }

    const orderMatch = notification.message.match(ORDER_ID_PATTERN);
    if (orderMatch) {
      this.router.navigate(['/orders', orderMatch[1]]).then();
    }
  }

  displayMessage(message: string): string {
    const welcomeMatch = message.match(WELCOME_PATTERN);
    if (welcomeMatch) {
      return this.translateService.instant('NOTIF_WELCOME', { name: welcomeMatch[1] });
    }

    if (message === VERIFY_EMAIL_MESSAGE) {
      return this.translateService.instant('NOTIF_VERIFY_EMAIL');
    }

    const orderMatch = message.match(ORDER_CREATED_PATTERN);
    if (orderMatch) {
      const total = this.pricePipe.transform(parseFloat(orderMatch[2]));
      return this.translateService.instant('NOTIF_ORDER_CREATED', { orderId: orderMatch[1], total });
    }

    return message;
  }
}
