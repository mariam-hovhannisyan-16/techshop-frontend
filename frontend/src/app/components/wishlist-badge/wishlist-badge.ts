import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { WishlistService } from '../../services/wishlist';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-wishlist-badge',
  imports: [TranslatePipe, Icon],
  templateUrl: './wishlist-badge.html',
  styleUrl: './wishlist-badge.scss',
})
export class WishlistBadge {
  constructor(
    private wishlistService: WishlistService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private router: Router
  ) {}

  get count(): number {
    return this.wishlistService.count();
  }

  goToWishlist(): void {
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.router.navigate(['/wishlist']).then();
  }
}
