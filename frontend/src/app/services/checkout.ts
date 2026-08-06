import { Injectable } from '@angular/core';

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'IDRAM' | 'TELCELL' | 'ROKET_LINE' | 'INSTALLMENT' | 'CARD';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private addressKey(userId: number): string {
    return `checkout_address_${userId}`;
  }

  private paymentKey(userId: number): string {
    return `checkout_payment_${userId}`;
  }

  getAddress(userId: number): CheckoutAddress | null {
    const raw = localStorage.getItem(this.addressKey(userId));
    return raw ? JSON.parse(raw) : null;
  }

  saveAddress(userId: number, address: CheckoutAddress): void {
    localStorage.setItem(this.addressKey(userId), JSON.stringify(address));
  }

  getPaymentMethod(userId: number): PaymentMethod | null {
    return localStorage.getItem(this.paymentKey(userId)) as PaymentMethod | null;
  }

  savePaymentMethod(userId: number, method: PaymentMethod): void {
    localStorage.setItem(this.paymentKey(userId), method);
  }
}
