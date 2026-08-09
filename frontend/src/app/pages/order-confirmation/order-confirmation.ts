import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderService, OrderResponse, PaymentMethod } from '../../services/order';
import { Auth } from '../../services/auth';
import { AppHeader } from '../../components/app-header/app-header';
import { OrderTracking } from '../../components/order-tracking/order-tracking';
import { Icon } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

type ResultState = 'verifying' | 'success' | 'failed';

interface CheckoutNavState {
  justCheckedOut?: boolean;
  paymentMethod?: PaymentMethod;
}

@Component({
  selector: 'app-order-confirmation',
  imports: [CommonModule, TranslatePipe, AppHeader, OrderTracking, Icon, PricePipe],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
})
export class OrderConfirmation implements OnInit {
  orderId = 0;
  userId: number = 1;
  state: ResultState = 'verifying';
  order: OrderResponse | undefined;
  errorMessage = '';
  paymentMethod: PaymentMethod | null = null;

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

    const navState = history.state as CheckoutNavState | undefined;

    if (navState?.justCheckedOut) {
      this.paymentMethod = navState.paymentMethod ?? null;
      // No payment method here has a real external gateway — checkout.ts creates the
      // order (either via the backend or a local mock) and this page just confirms it,
      // the same way it already did for Cash/Card. There's nothing to redirect to.
      this.verifyPayment();
    } else {
      this.loadExistingOrder();
    }
  }

  private verifyPayment(): void {
    this.state = 'verifying';
    this.errorMessage = '';
    this.cdr.detectChanges();
    this.orderService.payOrder(this.orderId).subscribe({
      next: (response) => {
        this.order = response.data;
        this.state = 'success';
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'PAYMENT_FAILED_MESSAGE';
        this.state = 'failed';
        this.cdr.detectChanges();
      }
    });
  }

  retryPayment(): void {
    this.verifyPayment();
  }

  private loadExistingOrder(): void {
    this.state = 'verifying';
    this.orderService.getOrderById(this.userId, this.orderId).subscribe({
      next: (order) => {
        this.order = order;
        if (!order) {
          this.errorMessage = 'FAILED_TO_LOAD_ORDER';
          this.state = 'failed';
        } else {
          this.state = order.paymentStatus === 'PAID' ? 'success' : 'failed';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_ORDER';
        this.state = 'failed';
        this.cdr.detectChanges();
      }
    });
  }

  viewOrderDetails(): void {
    this.router.navigate(['/orders', this.orderId]).then();
  }

  continueShopping(): void {
    this.router.navigate(['/products']).then();
  }
}
