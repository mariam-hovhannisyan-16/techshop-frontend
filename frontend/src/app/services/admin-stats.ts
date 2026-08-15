import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { Auth } from './auth';
import { OrderItemResponse, OrderResponse } from './order';
import { environment } from '../../environments/environment';

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

export interface OrdersByDay {
  date: string;
  orderCount: number;
  revenue: number;
}

export interface AdminStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  topProducts: TopProduct[];
  ordersByDay: OrdersByDay[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminStatsService {
  private ordersUrl = `${environment.orderApiUrl}/api/orders`;
  private usersUrl = `${environment.usersApiUrl}/api/users`;

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
        topProducts: this.computeTopProducts(orders.data.content),
        ordersByDay: this.computeOrdersByDay(orders.data.content)
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

  private computeOrdersByDay(orders: OrderResponse[]): OrdersByDay[] {
    const totals = new Map<string, OrdersByDay>();
    for (const order of orders) {
      const date = order.createdAt.slice(0, 10);
      const existing = totals.get(date);
      if (existing) {
        existing.orderCount += 1;
        existing.revenue += order.totalPrice;
      } else {
        totals.set(date, { date, orderCount: 1, revenue: order.totalPrice });
      }
    }
    return Array.from(totals.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
