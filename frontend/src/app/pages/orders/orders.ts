import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderService, OrderResponse } from '../../services/order';
import { Auth } from '../../services/auth';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, PricePipe],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  orders: OrderResponse[] = [];
  loading = true;
  errorMessage = '';
  userId: number = 1;

  constructor(
    private orderService: OrderService,
    private authService: Auth,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.orderService.getUserOrders(this.userId).subscribe({
      next: (response) => {
        this.orders = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_ORDERS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewOrder(orderId: number): void {
    this.router.navigate(['/orders', orderId]).then();
  }
}
