import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { Auth } from './auth';
import { OrderItemResponse, OrderResponse } from './order';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface OrderStatisticsResponse {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface AdminUserSummary {
  id: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
}

export interface AdminStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  topProducts: TopProduct[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private ordersUrl = 'http://localhost:8083/api/orders';
  private usersUrl = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient, private authService: Auth) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getSummary(): Observable<AdminStatsSummary> {
    return forkJoin({
      statistics: this.http.get<ApiResponse<OrderStatisticsResponse>>(`${this.ordersUrl}/admin/statistics`, { headers: this.getHeaders() }),
      orders: this.http.get<ApiResponse<PageResponse<OrderResponse>>>(`${this.ordersUrl}/admin?page=0&size=100`, { headers: this.getHeaders() }),
      users: this.http.get<ApiResponse<AdminUserSummary[]>>(this.usersUrl, { headers: this.getHeaders() })
    }).pipe(
      map(({ statistics, orders, users }) => ({
        totalOrders: statistics.data.totalOrders,
        totalRevenue: statistics.data.totalRevenue,
        totalUsers: users.data.length,
        topProducts: this.computeTopProducts(orders.data.content)
      }))
    );
  }

  private computeTopProducts(orders: OrderResponse[]): TopProduct[] {
    const totals = new Map<number, TopProduct>();
    for (const order of orders) {
      for (const item of order.items as OrderItemResponse[]) {
        const existing = totals.get(item.productId);
        if (existing) {
          existing.quantitySold += item.quantity;
        } else {
          totals.set(item.productId, { productId: item.productId, productName: item.productName, quantitySold: item.quantity });
        }
      }
    }
    return Array.from(totals.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);
  }
}
