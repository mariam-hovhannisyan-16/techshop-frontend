import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderService, OrderResponse } from '../../services/order';
import { Auth } from '../../services/auth';
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

  constructor(
    private orderService: OrderService,
    private authService: Auth,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
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
}
