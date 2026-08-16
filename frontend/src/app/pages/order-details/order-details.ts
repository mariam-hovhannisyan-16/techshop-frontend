import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrderService, OrderResponse, ORDER_STATUS_TRANSITIONS } from '../../services/order';
import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { OrderTracking } from '../../components/order-tracking/order-tracking';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

@Component({
  selector: 'app-order-details',
  imports: [CommonModule, TranslatePipe, Toast, OrderTracking, AppHeader, Icon, PricePipe],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails implements OnInit {
  order: OrderResponse | undefined;
  loading = true;
  errorMessage = '';
  notFound = false;
  userId: number = 1;
  orderId: number = 0;
  cancelling = false;

  constructor(
    private orderService: OrderService,
    private authService: Auth,
    private toastService: ToastService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  get canCancel(): boolean {
    return !!this.order && ORDER_STATUS_TRANSITIONS[this.order.status].includes('CANCELLED');
  }

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadOrder();
  }

  loadOrder(): void {
    this.loading = true;
    this.errorMessage = '';
    this.notFound = false;
    this.orderService.getOrderById(this.userId, this.orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.notFound = !order;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_ORDER';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelOrder(): void {
    if (!this.order || this.cancelling) return;

    const confirmed = window.confirm(this.translateService.instant('CONFIRM_CANCEL_ORDER', { id: this.order.id }));
    if (!confirmed) return;

    this.cancelling = true;
    this.orderService.cancelOrder(this.order.id).subscribe({
      next: (response) => {
        this.order = response.data;
        this.cancelling = false;
        this.toastService.show(this.translateService.instant('ORDER_CANCEL_SUCCESS'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.cancelling = false;
        this.toastService.show(this.translateService.instant('ORDER_CANCEL_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
