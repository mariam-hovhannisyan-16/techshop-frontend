import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { Auth } from './auth';
import { Product } from './product';
import { SoundService } from './sound';
import { environment } from '../../environments/environment';

export interface CartItemResponse {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
  productImage?: string;
  productRating?: number;
  productReviewCount?: number;
  productStock?: number;
}

export interface CartResponse {
  id: number;
  userId: number;
  items: CartItemResponse[];
  totalPrice: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface LocalCartLine {
  productId: number;
  quantity: number;
}

const LOCAL_CART_KEY_PREFIX = 'local_cart_';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.cartApiUrl}/api/cart`;

  private readonly itemCountSignal = signal<number>(0);
  readonly itemCount = this.itemCountSignal.asReadonly();

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private productService: Product,
    private soundService: SoundService
  ) {
    if (this.authService.getToken()) {
      this.refresh();
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private updateCountFrom(cart: CartResponse): void {
    this.itemCountSignal.set(cart.items.reduce((sum, item) => sum + item.quantity, 0));
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private isFallbackEligible(err: unknown): boolean {
    return this.isUnreachable(err) || (err instanceof HttpErrorResponse && err.status === 404);
  }

  private readLocalCart(userId: number): LocalCartLine[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_CART_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeLocalCart(userId: number, lines: LocalCartLine[]): void {
    localStorage.setItem(`${LOCAL_CART_KEY_PREFIX}${userId}`, JSON.stringify(lines));
  }

  private buildLocalCartResponse(userId: number): Observable<ApiResponse<CartResponse>> {
    const lines = this.readLocalCart(userId);
    if (lines.length === 0) {
      return of({ success: true, message: 'mock', data: { id: userId, userId, items: [], totalPrice: 0 } });
    }

    return this.productService.getAllProducts().pipe(
      map(catalogResponse => {
        const catalogById = new Map(catalogResponse.data.map(p => [p.id, p]));
        const items: CartItemResponse[] = lines.map(line => {
          const product = catalogById.get(line.productId);
          const price = product?.price ?? 0;
          return {
            productId: line.productId,
            productName: product?.name ?? `#${line.productId}`,
            productPrice: price,
            productImage: product?.imageUrl,
            productRating: product?.rating,
            productReviewCount: product?.reviewCount,
            productStock: product?.quantity,
            quantity: line.quantity,
            totalPrice: price * line.quantity
          };
        });
        const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
        return { success: true, message: 'mock', data: { id: userId, userId, items, totalPrice } };
      })
    );
  }

  private withProductImages(response: ApiResponse<CartResponse>): Observable<ApiResponse<CartResponse>> {
    if (response.data.items.length === 0) return of(response);
    return this.productService.getAllProducts().pipe(
      map(catalogResponse => {
        const catalogById = new Map(catalogResponse.data.map(p => [p.id, p]));
        const items = response.data.items.map(item => {
          const product = catalogById.get(item.productId);
          return {
            ...item,
            productImage: product?.imageUrl,
            productRating: product?.rating,
            productReviewCount: product?.reviewCount,
            productStock: product?.quantity
          };
        });
        return { ...response, data: { ...response.data, items } };
      })
    );
  }

  refresh(): void {
    const userId = this.authService.getUserId();
    if (!userId || this.authService.isAdmin()) return;
    this.getCart(userId).subscribe({ error: () => {} });
  }

  clearLocalState(): void {
    this.itemCountSignal.set(0);
  }

  clearCart(userId: number): void {
    this.writeLocalCart(userId, []);
    this.itemCountSignal.set(0);
  }

  getCart(userId: number): Observable<ApiResponse<CartResponse>> {
    return this.http.get<ApiResponse<CartResponse>>(`${this.apiUrl}/${userId}`, { headers: this.getHeaders() }).pipe(
      switchMap(response => this.withProductImages(response)),
      tap(response => this.updateCountFrom(response.data)),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Cart] Backend at ${this.apiUrl} is unreachable or doesn't recognize this cart — using local cart for development.`);
          return this.buildLocalCartResponse(userId).pipe(tap(response => this.updateCountFrom(response.data)));
        }
        return throwError(() => err);
      })
    );
  }

  addItem(userId: number, productId: number, quantity: number): Observable<ApiResponse<CartResponse>> {
    return this.http.post<ApiResponse<CartResponse>>(`${this.apiUrl}/${userId}/items`, { productId, quantity }, { headers: this.getHeaders() }).pipe(
      switchMap(response => this.withProductImages(response)),
      tap(response => this.updateCountFrom(response.data)),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Cart] Backend at ${this.apiUrl} is unreachable or doesn't recognize this product/cart — using local cart for development.`);
          const lines = this.readLocalCart(userId);
          const existing = lines.find(line => line.productId === productId);
          if (existing) {
            existing.quantity += quantity;
          } else {
            lines.push({ productId, quantity });
          }
          this.writeLocalCart(userId, lines);
          return this.buildLocalCartResponse(userId).pipe(tap(response => this.updateCountFrom(response.data)));
        }
        return throwError(() => err);
      }),

      tap(() => this.soundService.playAddToCart())
    );
  }

  removeItem(userId: number, productId: number): Observable<ApiResponse<CartResponse>> {
    return this.http.delete<ApiResponse<CartResponse>>(`${this.apiUrl}/${userId}/items/${productId}`, { headers: this.getHeaders() }).pipe(
      switchMap(response => this.withProductImages(response)),
      tap(response => this.updateCountFrom(response.data)),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Cart] Backend at ${this.apiUrl} is unreachable or doesn't recognize this product/cart — using local cart for development.`);
          const lines = this.readLocalCart(userId).filter(line => line.productId !== productId);
          this.writeLocalCart(userId, lines);
          return this.buildLocalCartResponse(userId).pipe(tap(response => this.updateCountFrom(response.data)));
        }
        return throwError(() => err);
      })
    );
  }

  // The backend has no dedicated "set quantity" endpoint — addItem is additive (increments
  // the existing line) and removeItem drops the line entirely. Compose those two primitives
  // to reach an arbitrary target quantity instead of adding new backend surface.
  updateItemQuantity(userId: number, productId: number, currentQuantity: number, newQuantity: number): Observable<ApiResponse<CartResponse>> {
    if (newQuantity <= 0) {
      return this.removeItem(userId, productId);
    }
    if (newQuantity > currentQuantity) {
      return this.addItem(userId, productId, newQuantity - currentQuantity);
    }
    if (newQuantity < currentQuantity) {
      return this.removeItem(userId, productId).pipe(
        switchMap(() => this.addItem(userId, productId, newQuantity))
      );
    }
    return this.getCart(userId);
  }
}
