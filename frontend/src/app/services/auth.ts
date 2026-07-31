import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { catchError, Observable, of, throwError } from 'rxjs';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  emailVerified?: boolean;
}

interface AuthResponse {
  token: string;
  user: UserResponse;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const USER_STORAGE_KEY = 'user';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'http://localhost:8081/api/users';

  constructor(
    private http: HttpClient,
    private translateService: TranslateService
  ) {
  }

  private isUnreachable(err: unknown): err is HttpErrorResponse {
    return err instanceof HttpErrorResponse && err.status === 0;
  }

  private mockAuthResponse(email: string, name?: string): ApiResponse<AuthResponse> {
    let hash = 7;
    for (const char of email) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    const userId = (Math.abs(hash) % 100000) + 1;

    const user: UserResponse = {
      id: userId,
      name: name || email.split('@')[0] || this.translateService.instant('GENERIC_USER'),
      email,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    const encode = (obj: object) => btoa(JSON.stringify(obj));
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ userId, mock: true })}.mock`;

    return { success: true, message: 'mock', data: { token, user } };
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Auth] Backend unreachable at ${this.apiUrl} — using local mock login for development.`);
          return of(this.mockAuthResponse(request.email));
        }
        return throwError(() => err);
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      catchError(err => {
        if (this.isUnreachable(err)) {
          console.warn(`[Auth] Backend unreachable at ${this.apiUrl} — using local mock registration for development.`);
          return of(this.mockAuthResponse(request.email, request.name));
        }
        return throwError(() => err);
      })
    );
  }

  verifyEmail(token: string): Observable<ApiResponse<UserResponse>> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.apiUrl}/verify-email`, { params: { token } });
  }

  resendVerification(email: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  saveUser(user: UserResponse): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  getUser(): UserResponse | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId ?? null;
    } catch {
      this.logout();
      return null;
    }
  }

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }
}
