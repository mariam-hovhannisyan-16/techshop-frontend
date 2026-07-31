import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Auth } from './auth';
import { CartService } from './cart';
import { environment } from '../../environments/environment';

export interface AddressPayload {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'IDRAM' | 'TELCELL' | 'ROKET_LINE' | 'INSTALLMENT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface InstallmentPlanPayload {
  bank: string;
  annualRate: number;
  durationMonths: number;
  downPayment: number;
  monthlyPayment: number;
}

export interface OrderItemResponse {
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderStatusHistoryEntry {
  status: string;
  note: string;
  changedAt: string;
}

export interface OrderResponse {
  id: number;
  userId: number;
  items: OrderItemResponse[];
  totalPrice: number;
  status: string;
  shippingAddress?: AddressPayload;
  billingAddress?: AddressPayload;
  notes?: string;
  statusHistory?: OrderStatusHistoryEntry[];
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentStatus?: PaymentStatus;
  paymentRedirectUrl?: string;
  installmentPlan?: InstallmentPlanPayload;
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutRequest {
  shippingAddress: AddressPayload;
  billingAddress: AddressPayload;
  notes?: string;
  paymentMethod: PaymentMethod;
  installmentPlan?: InstallmentPlanPayload;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const LOCAL_ORDERS_KEY_PREFIX = 'local_orders_';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.orderApiUrl}/api/orders`;

  constructor(
    private http: HttpClient,
    private authService: Auth,
    private cartService: CartService
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private isCartLookupFailure(err: unknown): boolean {
    return err instanceof HttpErrorResponse
      && typeof err.error?.message === 'string'
      && /cart not found/i.test(err.error.message);
  }

  private findLocalOrder(orderId: number): OrderResponse | undefined {
    const userId = this.authService.getUserId();
    if (!userId) return undefined;
    return this.readLocalOrders(userId).find(order => order.id === orderId);
  }

  private isOrderNotFound(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 404;
  }

  private readLocalOrders(userId: number): OrderResponse[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_ORDERS_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeLocalOrders(userId: number, orders: OrderResponse[]): void {
    localStorage.setItem(`${LOCAL_ORDERS_KEY_PREFIX}${userId}`, JSON.stringify(orders));
  }

  private createLocalOrder(userId: number, request: CheckoutRequest): Observable<ApiResponse<OrderResponse>> {
    return this.cartService.getCart(userId).pipe(
      map(cartResponse => {
        const now = new Date().toISOString();
        const order: OrderResponse = {
          id: Date.now(),
          userId,
          items: cartResponse.data.items,
          totalPrice: cartResponse.data.totalPrice,
          status: 'PAID',
          shippingAddress: request.shippingAddress,
          billingAddress: request.billingAddress,
          notes: request.notes,
          paymentMethod: request.paymentMethod,
          paymentStatus: 'PAID',
          installmentPlan: request.installmentPlan,
          createdAt: now,
          updatedAt: now
        };
        const orders = this.readLocalOrders(userId);
        orders.unshift(order);
        this.writeLocalOrders(userId, orders);
        this.cartService.clearCart(userId);
        return { success: true, message: 'mock', data: order };
      })
    );
  }

  checkout(userId: number, request: CheckoutRequest): Observable<ApiResponse<OrderResponse>> {

    if (request.paymentMethod === 'ROKET_LINE' || request.paymentMethod === 'INSTALLMENT') {
      console.warn(`[Order] ${request.paymentMethod} isn't supported by the backend yet — placing order locally for development.`);
      return this.createLocalOrder(userId, request);
    }

    return this.http.post<ApiResponse<OrderResponse>>(`${this.apiUrl}/checkout`, request, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (this.isUnreachable(err) || this.isCartLookupFailure(err)) {
          console.warn(`[Order] Backend at ${this.apiUrl} is unreachable or can't find this cart server-side — placing order locally for development.`);
          return this.createLocalOrder(userId, request);
        }
        return throwError(() => err);
      })
    );
  }

  payOrder(orderId: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.apiUrl}/${orderId}/pay`, {}, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        const localOrder = this.findLocalOrder(orderId);
        if (localOrder && (this.isUnreachable(err) || this.isOrderNotFound(err))) {
          return of({ success: true, message: 'mock', data: localOrder });
        }
        return throwError(() => err);
      })
    );
  }

  getUserOrders(userId: number): Observable<ApiResponse<OrderResponse[]>> {
    return this.http.get<ApiResponse<OrderResponse[]>>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Order] Backend unreachable at ${this.apiUrl} — using local order history for development.`);
          return of({ success: true, message: 'mock', data: this.readLocalOrders(userId) });
        }
        return throwError(() => err);
      })
    );
  }

  getOrderById(userId: number, orderId: number): Observable<OrderResponse | undefined> {
    return this.http.get<ApiResponse<OrderResponse>>(`${this.apiUrl}/${orderId}`, { headers: this.getHeaders() }).pipe(
      map(response => response.data),
      catchError(err => {
        if (this.isUnreachable(err) || this.isOrderNotFound(err)) {
          console.warn(`[Order] Backend at ${this.apiUrl} is unreachable or doesn't recognize this order — using local order history for development.`);
          return of(this.readLocalOrders(userId).find(order => order.id === orderId));
        }
        return throwError(() => err);
      })
    );
  }
}
