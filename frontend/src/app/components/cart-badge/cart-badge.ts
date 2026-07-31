import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CartService } from '../../services/cart';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-cart-badge',
  imports: [TranslatePipe, Icon],
  templateUrl: './cart-badge.html',
  styleUrl: './cart-badge.scss',
})
export class CartBadge {
  constructor(
    private cartService: CartService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private router: Router
  ) {}

  get count(): number {
    return this.cartService.itemCount();
  }

  goToCart(): void {
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.router.navigate(['/cart']).then();
  }
}
