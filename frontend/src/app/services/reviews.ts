import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  productId: number;
  rating: number;
  comment: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  private apiUrl = `${environment.orderApiUrl}/api/reviews`;

  constructor(
    private http: HttpClient,
    private authService: Auth
  ) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getReviews(productId: number): Observable<Review[]> {
    return this.http.get<ApiResponse<PageResponse<Review>>>(this.apiUrl, {
      params: { productId: String(productId), size: '100' }
    }).pipe(
      map(response => response.data.content)
    );
  }

  getAverageRating(productId: number): Observable<number> {
    return this.getReviews(productId).pipe(
      map(reviews => reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0)
    );
  }

  createReview(request: CreateReviewRequest): Observable<ApiResponse<Review>> {
    return this.http.post<ApiResponse<Review>>(this.apiUrl, request, { headers: this.getHeaders() });
  }
}
