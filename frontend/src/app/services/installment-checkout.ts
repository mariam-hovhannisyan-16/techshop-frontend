import { Injectable } from '@angular/core';

export interface PendingInstallmentPlan {
  bank: string;
  annualRate: number;
  durationMonths: number;
  downPayment: number;
  monthlyPayment: number;
}

const STORAGE_KEY = 'pending_installment_plan';

@Injectable({
  providedIn: 'root'
})
export class InstallmentCheckoutService {
  setPending(plan: PendingInstallmentPlan): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }

  peekPending(): PendingInstallmentPlan | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  clear(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
