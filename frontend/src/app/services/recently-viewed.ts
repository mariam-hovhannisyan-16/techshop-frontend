import { Injectable, signal } from '@angular/core';

export interface RecentlyViewedEntry {
  id: number;
  name: string;
  price: number;
  viewedAt: string;
  images?: string[];
}

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ENTRIES = 8;

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  readonly items = signal<RecentlyViewedEntry[]>(this.readStored());

  private readStored(): RecentlyViewedEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persist(entries: RecentlyViewedEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    this.items.set(entries);
  }

  record(product: { id: number; name: string; price: number; images?: string[] }): void {
    const existing = this.items().filter(entry => entry.id !== product.id);
    const updated = [
      { id: product.id, name: product.name, price: product.price, images: product.images, viewedAt: new Date().toISOString() },
      ...existing
    ].slice(0, MAX_ENTRIES);
    this.persist(updated);
  }

  getOthersThan(productId: number): RecentlyViewedEntry[] {
    return this.items().filter(entry => entry.id !== productId);
  }
}
