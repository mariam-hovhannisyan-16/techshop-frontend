import { ChangeDetectorRef, Component, HostListener, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Icon } from '../icon/icon';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { CartService } from '../../services/cart';
import { InstallmentCheckoutService } from '../../services/installment-checkout';
import { ToastService } from '../../services/toast';

interface AmortizationRow {
  month: number;
  interest: number;
  principal: number;
  totalPayment: number;
}

interface AmortizationTotals {
  interest: number;
  principal: number;
  total: number;
}

const DURATION_OPTIONS_MONTHS = [3, 6, 12, 24];
const BANK_OPTIONS = ['Յունիբանկ', 'Ամերիաբանկ', 'Արցախբանկ'];
const DEFAULT_ANNUAL_RATE = 18.5;
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

@Component({
  selector: 'app-installment-modal',
  imports: [FormsModule, TranslatePipe, Icon],
  templateUrl: './installment-modal.html',
  styleUrl: './installment-modal.scss',
})
export class InstallmentModal {
  @Input({ required: true }) price!: number;
  @Input({ required: true }) productId!: number;

  readonly durationOptions = DURATION_OPTIONS_MONTHS;
  readonly bankOptions = BANK_OPTIONS;

  constructor(
    private cdr: ChangeDetectorRef,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private cartService: CartService,
    private installmentCheckoutService: InstallmentCheckoutService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private router: Router
  ) {}

  isOpen = signal(false);
  closing = signal(false);

  annualRate = DEFAULT_ANNUAL_RATE;
  durationMonths = DURATION_OPTIONS_MONTHS[2];
  bank = BANK_OPTIONS[0];
  downPayment: number | null = null;

  schedule: AmortizationRow[] = [];
  calculated = false;
  monthlyPaymentAmount = 0;
  proceeding = false;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  formatNumber(amount: number): string {
    return NUMBER_FORMAT.format(Math.round(amount));
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.closing.set(false);
      this.calculated = false;
      this.schedule = [];
      this.monthlyPaymentAmount = 0;
    }, 220);
  }

  get downPaymentAmount(): number {
    return this.downPayment ?? 0;
  }

  get financedAmount(): number {
    return Math.max(0, this.price - this.downPaymentAmount);
  }

  get isDownPaymentTooHigh(): boolean {
    return this.downPaymentAmount >= this.price;
  }

  get totals(): AmortizationTotals {
    return this.schedule.reduce(
      (acc, row) => ({
        interest: acc.interest + row.interest,
        principal: acc.principal + row.principal,
        total: acc.total + row.totalPayment
      }),
      { interest: 0, principal: 0, total: 0 }
    );
  }

  calculate(): void {
    const principal = this.financedAmount;
    const months = this.durationMonths;

    if (principal <= 0 || months <= 0) {
      this.schedule = [];
      this.calculated = true;
      return;
    }

    const monthlyRate = (this.annualRate || 0) / 100 / 12;
    const monthlyPayment = monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

    let balance = principal;
    const rows: AmortizationRow[] = [];

    for (let month = 1; month <= months; month++) {
      const interest = balance * monthlyRate;
      const principalPortion = month === months ? balance : monthlyPayment - interest;
      balance -= principalPortion;

      rows.push({
        month,
        interest: Math.round(interest),
        principal: Math.round(principalPortion),
        totalPayment: Math.round(interest + principalPortion)
      });
    }

    this.schedule = rows;
    this.monthlyPaymentAmount = Math.round(monthlyPayment);
    this.calculated = true;
  }

  proceedWithInstallment(): void {
    if (this.schedule.length === 0 || this.proceeding) return;

    if (!this.authService.getToken()) {
      this.close();
      this.authDrawerService.open('login');
      return;
    }

    const userId = this.authService.getUserId() ?? 1;
    this.proceeding = true;
    this.cartService.addItem(userId, this.productId, 1).subscribe({
      next: () => {
        this.installmentCheckoutService.setPending({
          bank: this.bank,
          annualRate: this.annualRate,
          durationMonths: this.durationMonths,
          downPayment: this.downPaymentAmount,
          monthlyPayment: this.monthlyPaymentAmount
        });
        this.proceeding = false;
        this.close();
        this.router.navigate(['/checkout']).then();
        this.cdr.detectChanges();
      },
      error: () => {
        this.proceeding = false;
        this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
