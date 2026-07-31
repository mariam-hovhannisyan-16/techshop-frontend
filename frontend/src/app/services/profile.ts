import { Injectable } from '@angular/core';

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private phoneKey(userId: number): string {
    return `profile_phone_${userId}`;
  }

  private addressesKey(userId: number): string {
    return `profile_addresses_${userId}`;
  }

  getPhone(userId: number): string {
    return localStorage.getItem(this.phoneKey(userId)) ?? '';
  }

  savePhone(userId: number, phone: string): void {
    localStorage.setItem(this.phoneKey(userId), phone);
  }

  getAddresses(userId: number): SavedAddress[] {
    const raw = localStorage.getItem(this.addressesKey(userId));
    return raw ? JSON.parse(raw) : [];
  }

  private saveAddresses(userId: number, addresses: SavedAddress[]): void {
    localStorage.setItem(this.addressesKey(userId), JSON.stringify(addresses));
  }

  addAddress(userId: number, address: Omit<SavedAddress, 'id'>): SavedAddress[] {
    const updated = [...this.getAddresses(userId), { ...address, id: crypto.randomUUID() }];
    this.saveAddresses(userId, updated);
    return updated;
  }

  removeAddress(userId: number, addressId: string): SavedAddress[] {
    const updated = this.getAddresses(userId).filter(a => a.id !== addressId);
    this.saveAddresses(userId, updated);
    return updated;
  }
}
