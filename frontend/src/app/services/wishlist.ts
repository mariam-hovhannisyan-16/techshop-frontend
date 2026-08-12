import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { Auth } from './auth';
import { Product } from './product';
import { environment } from '../../environments/environment';

export interface WishlistItemResponse {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface BackendWishlistItem {
  id: number;
  product: { id: number; name: string; price: number; stock: number };
  addedAt: string;
}

interface BackendWishlistResponse {
  id: number | null;
  userId: number;
  items: BackendWishlistItem[];
  createdAt: string | null;
}

const LOCAL_WISHLIST_KEY_PREFIX = 'local_wishlist_';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = `${environment.wishlistApiUrl}/wishlist`;

  private readonly productIds = signal<Set<number>>(new Set());
  readonly count = computed(() => this.productIds().size);

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private productService: Product
  ) {
    if (this.authService.getToken()) {
      this.refresh();
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private isFallbackEligible(err: unknown): boolean {
    return this.isUnreachable(err)
      || (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 401));
  }

  private toWishlistItems(response: BackendWishlistResponse): WishlistItemResponse[] {
    return response.items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productPrice: item.product.price,
      quantity: item.product.stock
    }));
  }

  private localKey(): string {
    return `${LOCAL_WISHLIST_KEY_PREFIX}${this.authService.getUserId() ?? 0}`;
  }

  private readLocalIds(): number[] {
    try {
      const raw = localStorage.getItem(this.localKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeLocalIds(ids: number[]): void {
    localStorage.setItem(this.localKey(), JSON.stringify(ids));
  }

  private buildLocalWishlistResponse(): Observable<ApiResponse<WishlistItemResponse[]>> {
    const ids = this.readLocalIds();
    if (ids.length === 0) {
      return of({ success: true, message: 'mock', data: [] });
    }

    return this.productService.getAllProducts().pipe(
      map(catalogResponse => {
        const catalogById = new Map(catalogResponse.data.map(p => [p.id, p]));
        const data: WishlistItemResponse[] = ids.map(id => {
          const product = catalogById.get(id);
          return {
            productId: id,
            productName: product?.name ?? `#${id}`,
            productPrice: product?.price ?? 0,
            quantity: product?.quantity ?? 0
          };
        });
        return { success: true, message: 'mock', data };
      })
    );
  }

  isInWishlist(productId: number): boolean {
    return this.productIds().has(productId);
  }

  refresh(): void {
    if (this.authService.isAdmin()) return;
    this.getWishlist().subscribe({
      next: (response) => this.productIds.set(new Set(response.data.map(item => item.productId))),
      error: () => {}
    });
  }

  clearLocalState(): void {
    this.productIds.set(new Set());
  }

  getWishlist(): Observable<ApiResponse<WishlistItemResponse[]>> {
    return this.http.get<ApiResponse<BackendWishlistResponse>>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.toWishlistItems(response.data) })),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Wishlist] Backend at ${this.apiUrl} is unreachable, has no wishlist route, or rejected the request (401) — using local wishlist for development.`);
          return this.buildLocalWishlistResponse();
        }
        return throwError(() => err);
      })
    );
  }

  addToWishlist(productId: number): Observable<ApiResponse<WishlistItemResponse[]>> {
    return this.http.post<ApiResponse<BackendWishlistResponse>>(`${this.apiUrl}/products/${productId}`, {}, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.toWishlistItems(response.data) })),
      tap(() => this.productIds.update(ids => new Set(ids).add(productId))),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Wishlist] Backend at ${this.apiUrl} is unreachable, has no wishlist route, or rejected the request (401) — using local wishlist for development.`);
          const ids = this.readLocalIds();
          if (!ids.includes(productId)) ids.push(productId);
          this.writeLocalIds(ids);
          this.productIds.update(current => new Set(current).add(productId));
          return this.buildLocalWishlistResponse();
        }
        return throwError(() => err);
      })
    );
  }

  removeFromWishlist(productId: number): Observable<ApiResponse<WishlistItemResponse[]>> {
    return this.http.delete<ApiResponse<BackendWishlistResponse>>(`${this.apiUrl}/products/${productId}`, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.toWishlistItems(response.data) })),
      tap(() => this.productIds.update(ids => {
        const next = new Set(ids);
        next.delete(productId);
        return next;
      })),
      catchError(err => {
        if (this.isFallbackEligible(err)) {
          console.warn(`[Wishlist] Backend at ${this.apiUrl} is unreachable, has no wishlist route, or rejected the request (401) — using local wishlist for development.`);
          const ids = this.readLocalIds().filter(id => id !== productId);
          this.writeLocalIds(ids);
          this.productIds.update(current => {
            const next = new Set(current);
            next.delete(productId);
            return next;
          });
          return this.buildLocalWishlistResponse();
        }
        return throwError(() => err);
      })
    );
  }
}
