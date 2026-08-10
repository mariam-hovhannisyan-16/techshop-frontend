import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CartService, CartResponse } from '../../services/cart';
import { OrderService, AddressPayload, CheckoutRequest } from '../../services/order';
import { CheckoutService, CheckoutAddress, PaymentMethod } from '../../services/checkout';
import { InstallmentCheckoutService, PendingInstallmentPlan } from '../../services/installment-checkout';
import { InstallmentModal } from '../../components/installment-modal/installment-modal';
import { Auth } from '../../services/auth';
import { LanguageService } from '../../services/language';
import { currencyForLanguage, formatAmd } from '../../config/currency';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

interface SelectOption {
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, AppHeader, Icon, PricePipe, InstallmentModal],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout implements OnInit {
  userId: number = 1;

  address: CheckoutAddress = { firstName: '', lastName: '', phone: '', addressLine: '', city: '', state: '', postalCode: '', country: 'Armenia' };
  contactEmail = '';
  readonly phoneCountryCodes: string[] = ['+374'];
  phoneCountryCode = '+374';
  notes = '';
  agreedToTerms = false;
  formTouched = false;

  readonly cities: SelectOption[] = [
    { value: 'Yerevan', labelKey: 'CITY_YEREVAN' },
    { value: 'Gyumri', labelKey: 'CITY_GYUMRI' },
    { value: 'Vanadzor', labelKey: 'CITY_VANADZOR' },
    { value: 'Vagharshapat', labelKey: 'CITY_VAGHARSHAPAT' },
    { value: 'Abovyan', labelKey: 'CITY_ABOVYAN' },
    { value: 'Hrazdan', labelKey: 'CITY_HRAZDAN' },
    { value: 'Armavir', labelKey: 'CITY_ARMAVIR' },
    { value: 'Artashat', labelKey: 'CITY_ARTASHAT' },
    { value: 'Ashtarak', labelKey: 'CITY_ASHTARAK' },
    { value: 'Gavar', labelKey: 'CITY_GAVAR' },
    { value: 'Kapan', labelKey: 'CITY_KAPAN' },
    { value: 'Ijevan', labelKey: 'CITY_IJEVAN' },
    { value: 'Yeghegnadzor', labelKey: 'CITY_YEGHEGNADZOR' },
    { value: 'Dilijan', labelKey: 'CITY_DILIJAN' },
    { value: 'Goris', labelKey: 'CITY_GORIS' }
  ];

  paymentMethod: PaymentMethod | null = null;
  pendingInstallmentPlan: PendingInstallmentPlan | null = null;
  installmentUnavailable = false;

  cart: CartResponse | null = null;
  cartLoading = true;
  cartError = '';

  placingOrder = false;
  placeOrderError = '';

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private checkoutService: CheckoutService,
    private installmentCheckoutService: InstallmentCheckoutService,
    private authService: Auth,
    private languageService: LanguageService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  get displayCurrencyCode(): string {
    return currencyForLanguage(this.languageService.current()).code;
  }

  get showCurrencyNote(): boolean {
    return this.displayCurrencyCode !== 'AMD';
  }

  get amdChargeTotal(): string {
    return this.cart ? formatAmd(this.cart.totalPrice) : '';
  }

  get installmentMonthlyFormatted(): string {
    return this.pendingInstallmentPlan ? formatAmd(this.pendingInstallmentPlan.monthlyPayment) : '';
  }

  ngOnInit(): void {
    const savedAddress = this.checkoutService.getAddress(this.userId);
    if (savedAddress) {
      this.address = savedAddress;
    }

    const savedPayment = this.checkoutService.getPaymentMethod(this.userId);
    if (savedPayment) {
      this.paymentMethod = savedPayment;
    }

    this.pendingInstallmentPlan = this.installmentCheckoutService.peekPending();
    if (this.pendingInstallmentPlan) {
      this.paymentMethod = 'INSTALLMENT';
    }

    this.contactEmail = this.authService.getUser()?.email ?? '';

    this.loadCart();
  }

  loadCart(): void {
    this.cartLoading = true;
    this.cartError = '';
    this.cartService.getCart(this.userId).subscribe({
      next: (response) => {
        this.cart = response.data;
        this.cartLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cartError = 'FAILED_TO_LOAD_CART';
        this.cartLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get isAddressValid(): boolean {
    const a = this.address;
    return !!(a.firstName.trim() && a.lastName.trim() && a.phone.trim() && a.addressLine.trim() && a.city.trim() && a.postalCode.trim());
  }

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail.trim());
  }

  get isPaymentValid(): boolean {
    return !!this.paymentMethod && !(this.paymentMethod === 'INSTALLMENT' && !this.pendingInstallmentPlan);
  }

  get isCartEmpty(): boolean {
    return !this.cart || this.cart.items.length === 0;
  }

  get isFormValid(): boolean {
    return this.isAddressValid && this.isEmailValid && this.isPaymentValid && this.agreedToTerms && !this.isCartEmpty;
  }

  selectPayment(method: PaymentMethod): void {
    if (method === 'INSTALLMENT' && !this.pendingInstallmentPlan) {
      this.installmentUnavailable = true;
      return;
    }
    this.installmentUnavailable = false;
    this.paymentMethod = method;
  }

  onInstallmentPlanConfirmed(plan: PendingInstallmentPlan): void {
    this.pendingInstallmentPlan = plan;
    this.paymentMethod = 'INSTALLMENT';
    this.installmentUnavailable = false;
  }

  private buildAddressPayload(): AddressPayload {
    const a = this.address;
    return {
      fullName: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
      phone: `${this.phoneCountryCode}${a.phone.trim()}`,
      line1: a.addressLine.trim(),
      city: a.city.trim(),
      state: a.state?.trim() || undefined,
      postalCode: a.postalCode.trim(),
      country: a.country.trim()
    };
  }

  onSubmit(): void {
    this.formTouched = true;
    if (this.paymentMethod === 'INSTALLMENT' && !this.pendingInstallmentPlan) {
      this.installmentUnavailable = true;
    }
    if (!this.isFormValid) return;

    this.checkoutService.saveAddress(this.userId, this.address);
    this.checkoutService.savePaymentMethod(this.userId, this.paymentMethod!);
    this.placeOrder();
  }

  placeOrder(): void {
    if (this.isCartEmpty || this.placingOrder || !this.paymentMethod) return;
    if (this.paymentMethod === 'INSTALLMENT' && !this.pendingInstallmentPlan) return;
    this.placingOrder = true;
    this.placeOrderError = '';

    const addressPayload = this.buildAddressPayload();
    const request: CheckoutRequest = {
      shippingAddress: addressPayload,
      billingAddress: addressPayload,
      notes: this.notes.trim() || undefined,
      paymentMethod: this.paymentMethod,
      installmentPlan: this.paymentMethod === 'INSTALLMENT' && this.pendingInstallmentPlan
        ? this.pendingInstallmentPlan
        : undefined,
      language: this.languageService.current().toUpperCase() as CheckoutRequest['language']
    };

    this.orderService.checkout(this.userId, request).subscribe({
      next: (response) => {
        this.placingOrder = false;

        this.cartService.clearCart(this.userId);
        this.installmentCheckoutService.clear();
        this.router.navigate(['/order-confirmation', response.data.id], {
          state: {
            justCheckedOut: true,
            paymentMethod: response.data.paymentMethod ?? this.paymentMethod
          }
        }).then();
      },
      error: () => {
        this.placeOrderError = 'FAILED_TO_PLACE_ORDER';
        this.placingOrder = false;
        this.cdr.detectChanges();
      }
    });
  }
}
