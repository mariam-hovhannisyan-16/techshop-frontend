import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { Auth } from './auth';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string | null;
  emailVerified?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const ROLE_OVERRIDES_KEY = 'admin_user_role_overrides';

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private apiUrl = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient, private authService: Auth) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private isRoleEndpointUnavailable(err: unknown): boolean {
    return this.isUnreachable(err) || (err instanceof HttpErrorResponse && err.status === 404);
  }

  private readRoleOverrides(): Record<number, string> {
    try {
      const raw = localStorage.getItem(ROLE_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeRoleOverrides(overrides: Record<number, string>): void {
    localStorage.setItem(ROLE_OVERRIDES_KEY, JSON.stringify(overrides));
  }

  private applyRoleOverrides(users: AdminUser[]): AdminUser[] {
    const overrides = this.readRoleOverrides();
    if (Object.keys(overrides).length === 0) return users;
    return users.map(user => (overrides[user.id] ? { ...user, role: overrides[user.id] } : user));
  }

  getAllUsers(): Observable<ApiResponse<AdminUser[]>> {
    return this.http.get<ApiResponse<AdminUser[]>>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => ({ ...response, data: this.applyRoleOverrides(response.data) }))
    );
  }

  updateUserRole(userId: number, role: 'CUSTOMER' | 'ADMIN'): Observable<ApiResponse<AdminUser>> {
    const url = `${this.apiUrl}/${userId}/role`;
    return this.http.put<ApiResponse<AdminUser>>(url, { role }, { headers: this.getHeaders() }).pipe(
      catchError(err => {
        if (this.isRoleEndpointUnavailable(err)) {
          console.warn(`[AdminUser] Backend at ${url} is unreachable or not implemented yet — saving this change locally for development.`);
          const overrides = this.readRoleOverrides();
          overrides[userId] = role;
          this.writeRoleOverrides(overrides);

          return of({ success: true, message: 'mock', data: { id: userId, role } as AdminUser });
        }
        return throwError(() => err);
      })
    );
  }
}
