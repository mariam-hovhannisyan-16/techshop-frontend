import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Auth, UserResponse } from '../../services/auth';
import { ProfileService, SavedAddress } from '../../services/profile';
import { OrderService, OrderResponse } from '../../services/order';
import { WishlistService } from '../../services/wishlist';
import { CartService } from '../../services/cart';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon, IconName } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

type NewAddress = Omit<SavedAddress, 'id'>;
type Section = 'overview' | 'addresses' | 'change-password' | 'delete-account';

const EMPTY_ADDRESS: NewAddress = {
  label: '',
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  postalCode: '',
  country: ''
};

interface QuickAction {
  icon: IconName;
  titleKey: string;
  descriptionKey: string;
  action: () => void;
}

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, AppHeader, Icon, PricePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  section: Section = 'overview';

  user: UserResponse | null;
  userId: number;
  phone: string;
  editingInfo = false;

  addresses: SavedAddress[];
  showAddressForm = false;
  newAddress: NewAddress = { ...EMPTY_ADDRESS };

  orders: OrderResponse[] = [];
  ordersLoading = true;

  constructor(
    private authService: Auth,
    private profileService: ProfileService,
    private orderService: OrderService,
    public wishlistService: WishlistService,
    private cartService: CartService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router
  ) {
    this.userId = this.authService.getUserId() ?? 1;
    this.user = this.authService.getUser();
    this.phone = this.profileService.getPhone(this.userId);
    this.addresses = this.profileService.getAddresses(this.userId);
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.ordersLoading = true;
    this.orderService.getUserOrders(this.userId).subscribe({
      next: (response) => {
        this.orders = [...response.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.ordersLoading = false;
      },
      error: () => {
        this.ordersLoading = false;
      }
    });
  }

  get recentOrders(): OrderResponse[] {
    return this.orders.slice(0, 3);
  }

  get addressCount(): number {
    return this.addresses.length;
  }

  get userInitial(): string {
    const name = this.user?.name?.trim();
    return name ? name[0].toUpperCase() : '?';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  goToSection(section: Section): void {
    this.section = section;
  }

  private readonly allQuickActions: QuickAction[] = [
    {
      icon: 'edit',
      titleKey: 'PERSONAL_INFO',
      descriptionKey: 'QUICK_ACTION_PERSONAL_INFO_DESC',
      action: () => this.toggleEditInfo()
    },
    {
      icon: 'box',
      titleKey: 'ORDER_HISTORY',
      descriptionKey: 'QUICK_ACTION_ORDERS_DESC',
      action: () => this.router.navigate(['/orders'])
    },
    {
      icon: 'heart',
      titleKey: 'WISHLIST',
      descriptionKey: 'QUICK_ACTION_WISHLIST_DESC',
      action: () => this.router.navigate(['/wishlist'])
    },
    {
      icon: 'pin',
      titleKey: 'ADDRESS_BOOK',
      descriptionKey: 'QUICK_ACTION_ADDRESSES_DESC',
      action: () => this.goToSection('addresses')
    },
    {
      icon: 'lock',
      titleKey: 'CHANGE_PASSWORD',
      descriptionKey: 'QUICK_ACTION_PASSWORD_DESC',
      action: () => this.goToSection('change-password')
    }
  ];

  get quickActions(): QuickAction[] {
    return this.isAdmin ? this.allQuickActions.filter(a => a.titleKey !== 'WISHLIST') : this.allQuickActions;
  }

  toggleEditInfo(): void {
    this.section = 'overview';
    this.editingInfo = !this.editingInfo;
  }

  savePhone(): void {
    this.profileService.savePhone(this.userId, this.phone);
    this.editingInfo = false;
    this.toastService.show(this.translateService.instant('SAVED'), 'success');
  }

  toggleAddressForm(): void {
    this.showAddressForm = !this.showAddressForm;
    this.newAddress = { ...EMPTY_ADDRESS };
  }

  get isNewAddressValid(): boolean {
    return Object.values(this.newAddress).every(value => value.trim().length > 0);
  }

  addAddress(): void {
    if (!this.isNewAddressValid) return;
    this.addresses = this.profileService.addAddress(this.userId, this.newAddress);
    this.newAddress = { ...EMPTY_ADDRESS };
    this.showAddressForm = false;
    this.toastService.show(this.translateService.instant('TOAST_ADDRESS_SAVED'), 'success');
  }

  removeAddress(addressId: string): void {
    this.addresses = this.profileService.removeAddress(this.userId, addressId);
    this.toastService.show(this.translateService.instant('TOAST_ADDRESS_REMOVED'), 'success');
  }

  logout(): void {
    this.authService.logout();
    this.wishlistService.clearLocalState();
    this.cartService.clearLocalState();
    this.router.navigate(['/products']).then();
  }
}
