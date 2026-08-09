import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../../services/auth';
import { WishlistService } from '../../services/wishlist';
import { CartService } from '../../services/cart';
import { NotificationService } from '../../services/notification';
import { AuthDrawerService } from '../../services/auth-drawer';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-account-menu',
  imports: [TranslatePipe, Icon],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu {
  menuOpen = false;

  constructor(
    private authService: Auth,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private authDrawerService: AuthDrawerService,
    private router: Router
  ) {}

  get isLoggedIn(): boolean {
    return !!this.authService.getToken();
  }

  toggleMenu(): void {
    if (!this.isLoggedIn) {
      this.authDrawerService.open('login');
      return;
    }
    this.menuOpen = !this.menuOpen;
  }

  goTo(route: string): void {
    this.menuOpen = false;
    this.router.navigate([route]).then();
  }

  logout(): void {
    this.menuOpen = false;
    this.authService.logout();
    this.wishlistService.clearLocalState();
    this.cartService.clearLocalState();
    this.notificationService.clearLocalState();
    this.router.navigate(['/products']).then();
  }
}
