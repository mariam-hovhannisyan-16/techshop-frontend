import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TopBar } from '../top-bar/top-bar';
import { AccountMenu } from '../account-menu/account-menu';
import { NotificationsBadge } from '../notifications-badge/notifications-badge';
import { WishlistBadge } from '../wishlist-badge/wishlist-badge';
import { CartBadge } from '../cart-badge/cart-badge';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { FiltersToggle } from '../filters-toggle/filters-toggle';
import { Icon } from '../icon/icon';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [TopBar, AccountMenu, NotificationsBadge, WishlistBadge, CartBadge, ThemeToggle, FiltersToggle, Icon, TranslatePipe],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  @Input() subtitle = '';
  @Input() brandRoute = '/products';
  @Input() showFiltersToggle = false;

  menuOpen = false;

  constructor(private router: Router, private authService: Auth) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  goToBrand(): void {
    this.router.navigate([this.brandRoute]).then();
  }

  goToAdmin(): void {
    this.router.navigate(['/admin/products']).then();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }
}
