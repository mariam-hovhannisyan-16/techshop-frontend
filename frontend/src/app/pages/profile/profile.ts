import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Auth, UserResponse } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ProfileService, SavedAddress } from '../../services/profile';
import { OrderService, OrderResponse } from '../../services/order';
import { WishlistService } from '../../services/wishlist';
import { CartService } from '../../services/cart';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
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

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  passwordMismatch = false;
  passwordTooShort = false;
  changingPassword = false;

  constructor(
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private profileService: ProfileService,
    private orderService: OrderService,
    public wishlistService: WishlistService,
    private cartService: CartService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.ordersLoading = false;
        this.cdr.detectChanges();
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
    if (section === 'change-password') {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.passwordMismatch = false;
      this.passwordTooShort = false;
    }
  }

  openForgotPassword(): void {
    this.authDrawerService.openForgotPassword();
  }

  submitChangePassword(): void {
    if (this.changingPassword) return;

    this.passwordMismatch = this.newPassword !== this.confirmNewPassword;
    this.passwordTooShort = this.newPassword.length < 6;
    if (this.passwordMismatch || this.passwordTooShort) return;

    this.changingPassword = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.changingPassword = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.toastService.show(this.translateService.instant('TOAST_PASSWORD_CHANGED'), 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.changingPassword = false;
        this.toastService.show(err.error?.message || this.translateService.instant('CHANGE_PASSWORD_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
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
